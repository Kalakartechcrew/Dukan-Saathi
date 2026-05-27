import asyncio
import logging
import re
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path

import boto3
import httpx
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError

from app.core.config import settings
from app.core.database import get_db
from app.models.base import utc_now

logger = logging.getLogger(__name__)

S3_FILE_TTL_HOURS = 24


@dataclass
class WhatsAppSendResult:
    message_id: str
    media_id: str
    recipient: str
    pdf_url: str


class WhatsAppConfigurationError(RuntimeError):
    pass


class WhatsAppDeliveryError(RuntimeError):
    pass


def normalize_whatsapp_phone(phone: str | None) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if not digits:
        return ""
    if len(digits) == 10:
        return f"91{digits}"
    if len(digits) == 11 and digits.startswith("0"):
        return f"91{digits[1:]}"
    return digits


def whatsapp_bills_enabled(shop: dict | None) -> bool:
    payment = (shop or {}).get("payment") or {}
    return payment.get("whatsapp_bill_enabled", True)


def _ensure_configured() -> tuple[str, str, str, str, str]:
    if not settings.WHATSAPP_ENABLED:
        raise WhatsAppConfigurationError("WhatsApp Cloud API delivery is disabled")

    token = settings.WHATSAPP_CLOUD_API_TOKEN.strip()
    phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID.strip()
    version = settings.WHATSAPP_API_VERSION.strip() or "v22.0"
    bucket = settings.AWS_BUCKET_NAME.strip()
    region = settings.AWS_REGION.strip() or "ap-south-1"

    if not token or not phone_number_id:
        raise WhatsAppConfigurationError("WhatsApp Cloud API is not configured")
    if not settings.AWS_ACCESS_KEY.strip() or not settings.AWS_SECRET_KEY.strip() or not bucket:
        raise WhatsAppConfigurationError("AWS S3 bill delivery is not configured")
    return token, phone_number_id, version, bucket, region


def _s3_client(region: str):
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY,
        aws_secret_access_key=settings.AWS_SECRET_KEY,
        region_name=region,
    )


def _build_s3_key(*, shop_name: str, document_number: str, filename: str, folder: str) -> str:
    safe_shop = re.sub(r"[^a-z0-9]+", "-", (shop_name or "shop").strip().lower()).strip("-") or "shop"
    safe_document = re.sub(r"[^A-Za-z0-9._-]+", "-", document_number or Path(filename).stem).strip("-") or "document"
    return f"dukan-saathi-{safe_shop}-{folder}/{safe_document}.pdf"


def _upload_pdf_to_s3(*, pdf: bytes, bucket: str, region: str, s3_key: str) -> str:
    client = _s3_client(region)
    client.put_object(
        Bucket=bucket,
        Key=s3_key,
        Body=pdf,
        ContentType="application/pdf",
    )
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": s3_key},
        ExpiresIn=3600,
    )


def _delete_s3_object(*, bucket: str, region: str, s3_key: str) -> None:
    client = _s3_client(region)
    client.delete_object(Bucket=bucket, Key=s3_key)


async def cleanup_expired_bill_files(limit: int = 100) -> dict:
    db = get_db()
    now = utc_now()
    uploads = await db.bill_file_uploads.find({
        "status": "active",
        "delete_after": {"$lte": now},
    }).sort("delete_after", 1).limit(limit).to_list(limit)
    deleted = 0
    failed = 0
    for upload in uploads:
        try:
            await asyncio.to_thread(
                _delete_s3_object,
                bucket=upload["bucket"],
                region=upload["region"],
                s3_key=upload["s3_key"],
            )
            await db.bill_file_uploads.update_one(
                {"_id": upload["_id"]},
                {"$set": {"status": "deleted", "deleted_at": now, "updated_at": now}},
            )
            deleted += 1
        except (BotoCoreError, ClientError, NoCredentialsError) as exc:
            failed += 1
            logger.exception("Could not delete expired S3 bill file key=%s", upload.get("s3_key"))
            await db.bill_file_uploads.update_one(
                {"_id": upload["_id"]},
                {"$set": {"last_error": str(exc), "updated_at": now}},
            )
    return {"deleted": deleted, "failed": failed}


async def _record_uploaded_file(
    *,
    tenant_id: str,
    bucket: str,
    region: str,
    s3_key: str,
    document_number: str,
    kind: str,
) -> None:
    now = utc_now()
    await get_db().bill_file_uploads.insert_one({
        "tenant_id": tenant_id,
        "bucket": bucket,
        "region": region,
        "s3_key": s3_key,
        "document_number": document_number,
        "kind": kind,
        "status": "active",
        "delete_after": now + timedelta(hours=S3_FILE_TTL_HOURS),
        "created_at": now,
        "updated_at": now,
    })


async def send_pdf_via_whatsapp_template(
    *,
    tenant_id: str,
    recipient_phone: str,
    amount: str,
    pdf: bytes,
    filename: str,
    document_number: str,
    shop_name: str,
    kind: str,
) -> WhatsAppSendResult:
    await cleanup_expired_bill_files()

    token, phone_number_id, version, bucket, region = _ensure_configured()
    recipient = normalize_whatsapp_phone(recipient_phone)
    if not recipient:
        raise WhatsAppDeliveryError("Customer mobile number is required")

    s3_key = _build_s3_key(
        shop_name=shop_name,
        document_number=document_number,
        filename=filename,
        folder="bills" if kind == "invoice" else "receipts",
    )
    try:
        pdf_url = await asyncio.to_thread(
            _upload_pdf_to_s3,
            pdf=pdf,
            bucket=bucket,
            region=region,
            s3_key=s3_key,
        )
        await _record_uploaded_file(
            tenant_id=tenant_id,
            bucket=bucket,
            region=region,
            s3_key=s3_key,
            document_number=document_number,
            kind=kind,
        )
    except (FileNotFoundError, NoCredentialsError, BotoCoreError, ClientError) as exc:
        logger.exception("Could not upload PDF to S3 kind=%s document=%s", kind, document_number)
        raise WhatsAppDeliveryError("Could not upload PDF to S3") from exc

    payload = {
        "messaging_product": "whatsapp",
        "to": recipient,
        "type": "template",
        "template": {
            "name": settings.WHATSAPP_TEMPLATE_NAME,
            "language": {"code": settings.WHATSAPP_TEMPLATE_LANGUAGE},
            "components": [
                {
                    "type": "header",
                    "parameters": [
                        {
                            "type": "document",
                            "document": {
                                "link": pdf_url,
                                "filename": "invoice.pdf",
                            },
                        }
                    ],
                },
                {
                    "type": "body",
                    "parameters": [
                        {
                            "type": "text",
                            "text": amount,
                        }
                    ],
                },
            ],
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"https://graph.facebook.com/{version}/{phone_number_id}/messages",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
    if response.status_code >= 400:
        raise WhatsAppDeliveryError(_extract_error(response, "Could not send PDF on WhatsApp"))

    messages = response.json().get("messages") or []
    message_id = (messages[0] or {}).get("id", "")
    return WhatsAppSendResult(
        message_id=message_id,
        media_id="",
        recipient=recipient,
        pdf_url=pdf_url,
    )


def _extract_error(response: httpx.Response, fallback: str) -> str:
    try:
        detail = response.json().get("error", {}).get("message")
        if detail:
            return detail
    except ValueError:
        pass
    return fallback
