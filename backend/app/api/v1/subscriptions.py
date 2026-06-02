import hmac
import hashlib
from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
import httpx
from pydantic import BaseModel

from app.api.deps import get_current_user, get_tenant_id_without_subscription_check
from app.core.config import settings
from app.core.database import get_db
from app.models.base import serialize_doc, utc_now
from app.services.subscription_service import (
    activate_subscription,
    activate_subscription_from_razorpay,
    assert_plan_can_be_subscribed,
    create_razorpay_subscription,
    get_current_subscription,
    get_plan,
)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


class CheckoutRequest(BaseModel):
    plan_id: str
    provider: str = "razorpay"


class PaymentVerifyRequest(BaseModel):
    checkout_id: str
    provider_payment_id: str
    provider_order_id: str | None = None
    provider_subscription_id: str | None = None
    provider_signature: str | None = None
    status: str = "paid"


@router.get("/plans")
async def public_plans():
    db = get_db()
    plans = await db.subscription_plans.find({"is_active": True}).sort("price", 1).to_list(None)
    return [serialize_doc(plan) for plan in plans]


@router.get("/me")
async def my_subscription(tenant_id: Annotated[str, Depends(get_tenant_id_without_subscription_check)]):
    db = get_db()
    subscription = await get_current_subscription(tenant_id)
    if not subscription:
        return {}
    plan = await get_plan(subscription.get("plan_id") or subscription.get("plan_code"))
    payment = await db.subscription_payments.find_one(
        {"tenant_id": tenant_id},
        sort=[("created_at", -1)],
    )
    return {
        **subscription,
        "plan": plan,
        "latest_payment": serialize_doc(payment) if payment else None,
    }


@router.post("/checkout")
async def create_checkout(
    body: CheckoutRequest,
    tenant_id: Annotated[str, Depends(get_tenant_id_without_subscription_check)],
    user: Annotated[dict, Depends(get_current_user)],
):
    db = get_db()
    query = {"code": body.plan_id}
    if ObjectId.is_valid(body.plan_id):
        query = {"$or": [{"code": body.plan_id}, {"_id": ObjectId(body.plan_id)}]}
    plan = await db.subscription_plans.find_one(query)
    if not plan or not plan.get("is_active", True):
        raise HTTPException(404, "Plan not found")
    serialized_plan = serialize_doc(plan)
    await assert_plan_can_be_subscribed(tenant_id, serialized_plan)
    if float(plan.get("price") or 0) <= 0:
        subscription = await activate_subscription(tenant_id, str(plan["_id"]), payment_status="free", created_by=user["id"])
        return {"message": "Subscription activated", "subscription": subscription}
    if body.provider != "razorpay":
        raise HTTPException(400, "Only Razorpay checkout is available for shopkeeper subscriptions")
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(503, "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.")
    if not settings.RAZORPAY_KEY_ID.startswith(("rzp_test_", "rzp_live_")):
        raise HTTPException(503, "Razorpay key id is invalid. It must start with rzp_test_ or rzp_live_.")
    now = utc_now()
    amount_paise = int(round(float(plan.get("price", 0)) * 100))
    if plan.get("auto_pay_enabled", False):
        razorpay_subscription = await create_razorpay_subscription(tenant_id, user, serialized_plan)
        doc = {
            "tenant_id": tenant_id,
            "user_id": user["id"],
            "plan_id": str(plan["_id"]),
            "plan_code": plan["code"],
            "amount": plan.get("price", 0),
            "currency": plan.get("currency", "INR"),
            "provider": "razorpay",
            "provider_subscription_id": razorpay_subscription.get("id"),
            "razorpay_subscription": razorpay_subscription,
            "status": "created",
            "payment_mode": "recurring",
            "created_at": now,
        }
        result = await db.subscription_payments.insert_one(doc)
        doc["_id"] = result.inserted_id
        return {
            **serialize_doc(doc),
            "provider": "razorpay",
            "payment_mode": "recurring",
            "key_id": settings.RAZORPAY_KEY_ID,
            "subscription_id": razorpay_subscription.get("id"),
            "amount": amount_paise,
            "currency": plan.get("currency", "INR"),
            "name": "Sathi Subscription",
            "description": plan["name"],
        }

    receipt = f"sub_{tenant_id[-8:]}_{int(now.timestamp())}"
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            razorpay_res = await client.post(
                "https://api.razorpay.com/v1/orders",
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                json={
                    "amount": amount_paise,
                    "currency": plan.get("currency", "INR"),
                    "receipt": receipt,
                    "notes": {"tenant_id": tenant_id, "plan_code": plan["code"]},
                },
            )
    except httpx.RequestError as exc:
        raise HTTPException(502, f"Could not reach Razorpay: {exc.__class__.__name__}")
    if razorpay_res.status_code >= 400:
        raise HTTPException(502, f"Razorpay order creation failed: {_razorpay_error_message(razorpay_res)}")
    order = razorpay_res.json()
    doc = {
        "tenant_id": tenant_id,
        "user_id": user["id"],
        "plan_id": str(plan["_id"]),
        "plan_code": plan["code"],
        "amount": plan.get("price", 0),
        "currency": plan.get("currency", "INR"),
        "provider": "razorpay",
        "provider_order_id": order.get("id"),
        "razorpay_order": order,
        "status": "created",
        "payment_mode": "one_time",
        "created_at": now,
    }
    result = await db.subscription_payments.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {
        **serialize_doc(doc),
        "provider": "razorpay",
        "payment_mode": "one_time",
        "key_id": settings.RAZORPAY_KEY_ID,
        "order_id": order.get("id"),
        "amount": amount_paise,
        "currency": plan.get("currency", "INR"),
        "name": "Sathi Subscription",
        "description": plan["name"],
    }


@router.post("/verify-payment")
async def verify_payment(
    body: PaymentVerifyRequest,
    tenant_id: Annotated[str, Depends(get_tenant_id_without_subscription_check)],
    user: Annotated[dict, Depends(get_current_user)],
):
    db = get_db()
    if not ObjectId.is_valid(body.checkout_id):
        raise HTTPException(400, "Invalid checkout id")
    payment = await db.subscription_payments.find_one({"_id": ObjectId(body.checkout_id), "tenant_id": tenant_id})
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.get("status") == "paid":
        return {"message": "Payment already verified", "subscription": await get_current_subscription(tenant_id)}
    if payment.get("provider") == "razorpay":
        if not body.provider_signature:
            raise HTTPException(400, "Razorpay signature is required")
        expected_subscription_id = payment.get("provider_subscription_id")
        if expected_subscription_id:
            if not body.provider_subscription_id:
                raise HTTPException(400, "Razorpay subscription id is required")
            if body.provider_subscription_id != expected_subscription_id:
                raise HTTPException(400, "Payment subscription mismatch")
            payload = f"{body.provider_payment_id}|{expected_subscription_id}".encode()
        else:
            if not body.provider_order_id:
                raise HTTPException(400, "Razorpay order id is required")
            expected_order_id = payment.get("provider_order_id")
            if body.provider_order_id != expected_order_id:
                raise HTTPException(400, "Payment order mismatch")
            payload = f"{body.provider_order_id}|{body.provider_payment_id}".encode()
        expected = hmac.new(settings.RAZORPAY_KEY_SECRET.encode(), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, body.provider_signature):
            await db.subscription_payments.update_one(
                {"_id": payment["_id"]},
                {"$set": {"status": "failed", "provider_payment_id": body.provider_payment_id, "verified_at": utc_now(), "failure_reason": "signature_mismatch"}},
            )
            raise HTTPException(400, "Invalid payment signature")
    now = utc_now()
    await db.subscription_payments.update_one(
        {"_id": payment["_id"]},
        {"$set": {
            "status": body.status,
            "provider_payment_id": body.provider_payment_id,
            "provider_subscription_id": body.provider_subscription_id or payment.get("provider_subscription_id"),
            "verified_at": now,
        }},
    )
    if body.status != "paid":
        await db.notifications.insert_one({
            "tenant_id": tenant_id,
            "user_id": user["id"],
            "title": "Payment failed",
            "message": "Your subscription payment could not be verified. Please retry.",
            "type": "payment_failed",
            "severity": "high",
            "read": False,
            "created_at": now,
        })
        raise HTTPException(402, "Payment failed")
    if payment.get("provider_subscription_id"):
        subscription = await activate_subscription_from_razorpay(
            tenant_id,
            payment["plan_id"],
            provider_subscription_id=payment["provider_subscription_id"],
            provider_payment_id=body.provider_payment_id,
            created_by=user["id"],
            provider_payload=payment.get("razorpay_subscription"),
        )
    else:
        subscription = await activate_subscription(tenant_id, payment["plan_id"], payment_status="paid", created_by=user["id"])
    return {"message": "Subscription activated", "subscription": subscription}


@router.post("/cancel")
async def cancel_subscription(
    tenant_id: Annotated[str, Depends(get_tenant_id_without_subscription_check)],
    user: Annotated[dict, Depends(get_current_user)],
):
    db = get_db()
    now = utc_now()
    current = await get_current_subscription(tenant_id)
    provider_subscription_id = current.get("provider_subscription_id") if current else None
    if provider_subscription_id:
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    f"https://api.razorpay.com/v1/subscriptions/{provider_subscription_id}/cancel",
                    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                    json={"cancel_at_cycle_end": 0},
                )
        except httpx.RequestError as exc:
            raise HTTPException(502, f"Could not reach Razorpay: {exc.__class__.__name__}")
        if response.status_code >= 400:
            raise HTTPException(502, f"Razorpay subscription cancellation failed: {_razorpay_error_message(response)}")
    await db.subscriptions.update_many(
        {"tenant_id": tenant_id, "status": {"$in": ["trialing", "active", "past_due"]}},
        {"$set": {"status": "cancelled", "cancelled_by": user["id"], "updated_at": now}},
    )
    await db.shops.update_one({"_id": ObjectId(tenant_id)}, {"$set": {"subscription_status": "cancelled"}})
    return {"message": "Subscription cancelled"}


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(503, "Razorpay webhook secret is not configured")
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")
    expected = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(400, "Invalid webhook signature")

    payload = await request.json()
    event_id = request.headers.get("x-razorpay-event-id")
    db = get_db()
    if event_id:
        existing = await db.razorpay_webhooks.find_one({"event_id": event_id})
        if existing:
            return {"message": "duplicate ignored"}
    await db.razorpay_webhooks.insert_one({"event_id": event_id, "payload": payload, "created_at": utc_now()})

    event = payload.get("event")
    payment_entity = (((payload.get("payload") or {}).get("payment") or {}).get("entity") or {})
    subscription_entity = (((payload.get("payload") or {}).get("subscription") or {}).get("entity") or {})
    provider_subscription_id = subscription_entity.get("id") or payment_entity.get("subscription_id")
    if not provider_subscription_id:
        return {"message": "ignored"}

    payment_id = payment_entity.get("id")
    if event in {"subscription.activated", "subscription.charged", "payment.captured"}:
        local = await db.subscriptions.find_one({"provider_subscription_id": provider_subscription_id}, sort=[("created_at", -1)])
        if local:
            now = utc_now()
            current_end = _datetime_from_unix(subscription_entity.get("current_end"))
            update = {
                "status": "active",
                "payment_status": "paid",
                "provider_payment_id": payment_id or local.get("provider_payment_id"),
                "provider_payload": subscription_entity or payload,
                "updated_at": now,
            }
            if current_end:
                update["expires_at"] = current_end
                update["renews_at"] = current_end
            await db.subscriptions.update_one({"_id": local["_id"]}, {"$set": update})
            shop_update = {"subscription_status": "active", "updated_at": now}
            if current_end:
                shop_update["subscription_expires_at"] = current_end
            await db.shops.update_one({"_id": ObjectId(local["tenant_id"])}, {"$set": shop_update})
    elif event in {"subscription.cancelled", "subscription.completed", "subscription.expired", "subscription.halted", "payment.failed"}:
        status_value = "cancelled" if event == "subscription.cancelled" else "expired" if event == "subscription.expired" else "past_due"
        local = await db.subscriptions.find_one({"provider_subscription_id": provider_subscription_id}, sort=[("created_at", -1)])
        if local:
            await db.subscriptions.update_one(
                {"_id": local["_id"]},
                {"$set": {"status": status_value, "payment_status": "failed" if event == "payment.failed" else local.get("payment_status", "paid"), "provider_payload": payload, "updated_at": utc_now()}},
            )
            await db.shops.update_one({"_id": ObjectId(local["tenant_id"])}, {"$set": {"subscription_status": status_value, "updated_at": utc_now()}})
    return {"message": "ok"}


def _datetime_from_unix(value):
    if isinstance(value, (int, float)) and value > 0:
        from datetime import datetime, timezone
        return datetime.fromtimestamp(value, timezone.utc)
    return None


def _razorpay_error_message(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return f"HTTP {response.status_code}"
    error = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(error, dict):
        description = error.get("description") or error.get("reason") or error.get("code")
        if description:
            return str(description)
    return f"HTTP {response.status_code}"
