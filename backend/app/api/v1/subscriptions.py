import hmac
import hashlib
from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
import httpx
from pydantic import BaseModel

from app.api.deps import get_current_user, get_tenant_id_without_subscription_check
from app.core.config import settings
from app.core.database import get_db
from app.models.base import serialize_doc, utc_now
from app.services.subscription_service import activate_subscription, claim_free_plan_once, get_current_subscription, get_plan

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


class CheckoutRequest(BaseModel):
    plan_id: str
    provider: str = "razorpay"


class PaymentVerifyRequest(BaseModel):
    checkout_id: str
    provider_payment_id: str
    provider_order_id: str | None = None
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
    if float(plan.get("price") or 0) <= 0:
        if not plan.get("allow_resubscribe", False):
            await claim_free_plan_once(tenant_id, serialize_doc(plan))
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
        "created_at": now,
    }
    result = await db.subscription_payments.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {
        **serialize_doc(doc),
        "provider": "razorpay",
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
        if not body.provider_order_id or not body.provider_signature:
            raise HTTPException(400, "Razorpay order id and signature are required")
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
        {"$set": {"status": body.status, "provider_payment_id": body.provider_payment_id, "verified_at": now}},
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
    subscription = await activate_subscription(tenant_id, payment["plan_id"], payment_status="paid", created_by=user["id"])
    return {"message": "Subscription activated", "subscription": subscription}


@router.post("/cancel")
async def cancel_subscription(
    tenant_id: Annotated[str, Depends(get_tenant_id_without_subscription_check)],
    user: Annotated[dict, Depends(get_current_user)],
):
    db = get_db()
    now = utc_now()
    await db.subscriptions.update_many(
        {"tenant_id": tenant_id, "status": {"$in": ["trialing", "active", "past_due"]}},
        {"$set": {"status": "cancelled", "cancelled_by": user["id"], "updated_at": now}},
    )
    await db.shops.update_one({"_id": ObjectId(tenant_id)}, {"$set": {"subscription_status": "cancelled"}})
    return {"message": "Subscription cancelled"}


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
