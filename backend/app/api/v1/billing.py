import logging
from typing import Annotated, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, Response

from app.api.deps import get_current_user, get_tenant_id, require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.core.security import create_invoice_share_token, decode_invoice_share_token
from app.core.tenant import tenant_filter
from app.models.base import serialize_doc
from app.schemas.billing import InvoiceCreate, InvoiceResponse
from app.schemas.common import PaginatedResponse
from app.services import billing_service
from app.services.invoice_template import render_invoice_html, render_invoice_pdf
from app.services.whatsapp_service import (
    WhatsAppConfigurationError,
    WhatsAppDeliveryError,
    send_pdf_via_whatsapp_template,
    whatsapp_bills_enabled,
)
from app.services.subscription_service import assert_limit_available

router = APIRouter(prefix="/billing", tags=["Billing & POS"])
logger = logging.getLogger(__name__)


def _to_invoice_response(inv: dict) -> InvoiceResponse:
    data = dict(inv)
    if "payment_methods" not in data and data.get("payments"):
        data["payment_methods"] = [p.get("method", "") for p in data["payments"]]
    return InvoiceResponse(**{k: data[k] for k in InvoiceResponse.model_fields if k in data})


async def _load_invoice_and_shop(tenant_id: str, invoice_id: str) -> tuple[dict, dict]:
    db = get_db()
    try:
        object_id = ObjectId(invoice_id)
    except Exception:
        raise HTTPException(404, "Invoice not found")
    inv = await db.invoices.find_one(tenant_filter(tenant_id, {"_id": object_id}))
    shop = await db.shops.find_one({"_id": ObjectId(tenant_id)})
    if not inv or not shop:
        raise HTTPException(404, "Invoice not found")
    return serialize_doc(inv), serialize_doc(shop)


@router.get("/dashboard")
async def dashboard(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.DASHBOARD_VIEW))],
):
    return await billing_service.get_dashboard_stats(tenant_id)


@router.post("/reconcile-dues")
async def reconcile_dues(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.BILLING_CREATE))],
):
    return await billing_service.reconcile_customer_payments(tenant_id)


@router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(
    body: InvoiceCreate,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    user: Annotated[dict, Depends(require_permission(Permission.BILLING_CREATE))],
):
    await assert_limit_available(tenant_id, "monthly_invoices")
    try:
        inv = await billing_service.create_invoice(tenant_id, user["id"], body)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return InvoiceResponse(**{k: inv.get(k) for k in InvoiceResponse.model_fields if k in inv})


@router.get("/invoices", response_model=PaginatedResponse[InvoiceResponse])
async def list_invoices(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.BILLING_CREATE))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
):
    db = get_db()
    filt = tenant_filter(tenant_id)
    if status:
        filt["status"] = status
    total = await db.invoices.count_documents(filt)
    skip = (page - 1) * page_size
    items = await db.invoices.find(filt).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=[_to_invoice_response(serialize_doc(i)) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.BILLING_CREATE))],
):
    db = get_db()
    inv = await db.invoices.find_one(tenant_filter(tenant_id, {"_id": ObjectId(invoice_id)}))
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return _to_invoice_response(serialize_doc(inv))


@router.patch("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    body: InvoiceCreate,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    user: Annotated[dict, Depends(require_permission(Permission.BILLING_CREATE))],
):
    try:
        inv = await billing_service.update_invoice(tenant_id, invoice_id, user["id"], body)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return _to_invoice_response(inv)


@router.get("/invoices/{invoice_id}/html", response_class=HTMLResponse)
async def invoice_html(
    invoice_id: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.BILLING_CREATE))],
):
    invoice, shop = await _load_invoice_and_shop(tenant_id, invoice_id)
    html = render_invoice_html(shop, invoice)
    return HTMLResponse(html)


@router.get("/invoices/{invoice_id}/pdf")
async def invoice_pdf(
    invoice_id: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.BILLING_CREATE))],
):
    invoice, shop = await _load_invoice_and_shop(tenant_id, invoice_id)
    pdf = render_invoice_pdf(shop, invoice)
    filename = f"{invoice.get('invoice_number', 'invoice')}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/invoices/{invoice_id}/share")
async def invoice_share_link(
    invoice_id: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.BILLING_CREATE))],
):
    invoice, _ = await _load_invoice_and_shop(tenant_id, invoice_id)
    token = create_invoice_share_token(invoice_id=invoice["id"], tenant_id=tenant_id)
    return {
        "invoice_id": invoice["id"],
        "invoice_number": invoice.get("invoice_number"),
        "token": token,
        "path": f"/bill/{invoice['id']}?token={token}",
        "pdf_path": f"/billing/public/invoices/{invoice['id']}/pdf?token={token}",
    }


@router.get("/public/invoices/{invoice_id}/html", response_class=HTMLResponse)
async def public_invoice_html(invoice_id: str, token: str):
    try:
        payload = decode_invoice_share_token(token, invoice_id)
    except ValueError:
        raise HTTPException(403, "Invalid or expired bill link")
    invoice, shop = await _load_invoice_and_shop(payload["tenant_id"], invoice_id)
    html = render_invoice_html(shop, invoice, public_view=True)
    return HTMLResponse(html)


@router.get("/public/invoices/{invoice_id}/pdf")
async def public_invoice_pdf(invoice_id: str, token: str):
    try:
        payload = decode_invoice_share_token(token, invoice_id)
    except ValueError:
        raise HTTPException(403, "Invalid or expired bill link")
    invoice, shop = await _load_invoice_and_shop(payload["tenant_id"], invoice_id)
    pdf = render_invoice_pdf(shop, invoice)
    filename = f"{invoice.get('invoice_number', 'invoice')}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/invoices/{invoice_id}/whatsapp-pdf")
async def send_invoice_whatsapp_pdf(
    invoice_id: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.BILLING_CREATE))],
):
    invoice, shop = await _load_invoice_and_shop(tenant_id, invoice_id)
    if not whatsapp_bills_enabled(shop):
        raise HTTPException(400, "WhatsApp bill sharing is turned off in shop settings")
    customer_phone = invoice.get("customer_phone")
    if not customer_phone:
        raise HTTPException(400, "Customer mobile number is required to send bill PDF on WhatsApp")

    invoice_number = invoice.get("invoice_number", "invoice")
    pdf = render_invoice_pdf(shop, invoice)
    try:
        result = await send_pdf_via_whatsapp_template(
            tenant_id=tenant_id,
            recipient_phone=customer_phone,
            amount=f"{float(invoice.get('grand_total') or 0):.2f}",
            pdf=pdf,
            filename=f"{invoice_number}.pdf",
            document_number=invoice_number,
            shop_name=shop.get("name", "shop"),
            kind="invoice",
        )
    except WhatsAppConfigurationError as exc:
        raise HTTPException(503, str(exc))
    except WhatsAppDeliveryError as exc:
        raise HTTPException(502, str(exc))
    logger.info(
        "Invoice WhatsApp PDF accepted invoice_id=%s invoice_number=%s customer_phone=%s recipient=%s media_id=%s message_id=%s",
        invoice["id"],
        invoice_number,
        customer_phone,
        result.recipient,
        result.media_id,
        result.message_id,
    )
    return {
        "status": "sent",
        "message_id": result.message_id,
        "media_id": result.media_id,
        "recipient": result.recipient,
        "invoice_id": invoice["id"],
    }
