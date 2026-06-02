from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status
import httpx

from app.core.config import settings
from app.core.database import get_db
from app.models.base import serialize_doc, utc_now


async def ensure_default_plans() -> None:
    db = get_db()
    now = utc_now()
    if await db.subscription_plans.count_documents({}) > 0:
        await db.subscription_plans.update_many({}, {"$unset": {"is_single_subscribe": ""}})
        await db.subscription_plans.update_many(
            {"allow_resubscribe": {"$exists": False}},
            {"$set": {"allow_resubscribe": True, "updated_at": now}},
        )
        await db.subscription_plans.update_many(
            {"auto_pay_enabled": {"$exists": False}},
            {"$set": {"auto_pay_enabled": False, "updated_at": now}},
        )
        await db.subscription_plans.update_one(
            {"code": "trial"},
            {"$set": {"is_active": False, "updated_at": now}},
        )
        return
    plans = [
        {
            "code": "starter",
            "name": "Starter",
            "price": 499,
            "currency": "INR",
            "duration_days": 30,
            "plan_type": "monthly",
            "features": ["billing", "inventory", "customers", "reports", "expenses"],
            "limits": {
                "products": 500,
                "monthly_invoices": 1000,
                "storage_mb": 1024,
                "analytics": True,
                "backup": False,
            },
            "is_active": True,
            "allow_resubscribe": True,
            "auto_pay_enabled": False,
        },
        {
            "code": "growth",
            "name": "Growth",
            "price": 1499,
            "currency": "INR",
            "duration_days": 30,
            "plan_type": "monthly",
            "features": ["billing", "inventory", "customers", "reports", "expenses", "advanced_analytics", "backup"],
            "limits": {
                "products": 5000,
                "monthly_invoices": 10000,
                "storage_mb": 10240,
                "analytics": True,
                "backup": True,
            },
            "is_active": True,
            "allow_resubscribe": True,
            "auto_pay_enabled": False,
        },
        {
            "code": "annual-growth",
            "name": "Annual Growth",
            "price": 14999,
            "currency": "INR",
            "duration_days": 365,
            "plan_type": "yearly",
            "features": ["billing", "inventory", "customers", "reports", "expenses", "advanced_analytics", "backup"],
            "limits": {
                "products": 10000,
                "monthly_invoices": 20000,
                "storage_mb": 20480,
                "analytics": True,
                "backup": True,
            },
            "is_active": True,
            "allow_resubscribe": True,
            "auto_pay_enabled": False,
        },
    ]
    for plan in plans:
        await db.subscription_plans.update_one(
            {"code": plan["code"]},
            {"$setOnInsert": {**plan, "created_at": now}, "$set": {"updated_at": now}},
            upsert=True,
        )
    await db.subscription_plans.update_one(
        {"code": "trial"},
        {"$set": {"is_active": False, "updated_at": now}},
    )


async def create_pending_subscription(tenant_id: str, owner_user_id: str | None = None) -> dict:
    db = get_db()
    existing = await db.subscriptions.find_one({"tenant_id": tenant_id, "status": "pending"})
    if existing:
        return serialize_doc(existing)
    now = utc_now()
    doc = {
        "tenant_id": tenant_id,
        "plan_id": None,
        "plan_code": None,
        "plan_name": None,
        "status": "pending",
        "starts_at": None,
        "expires_at": None,
        "renews_at": None,
        "grace_until": None,
        "auto_renew": False,
        "payment_status": "unpaid",
        "created_by": owner_user_id,
        "created_at": now,
        "updated_at": now,
        "history": [{"event": "subscription_required", "at": now, "by": owner_user_id}],
    }
    result = await db.subscriptions.insert_one(doc)
    await db.shops.update_one(
        {"_id": ObjectId(tenant_id)},
        {"$set": {"subscription_plan": None, "subscription_status": "pending", "subscription_expires_at": None}},
    )
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def get_current_subscription(tenant_id: str, auto_create_pending: bool = False) -> dict | None:
    db = get_db()
    sub = await db.subscriptions.find_one({"tenant_id": tenant_id}, sort=[("created_at", -1)])
    if not sub and auto_create_pending:
        sub = await create_pending_subscription(tenant_id)
        return sub
    return serialize_doc(sub) if sub else None


async def get_plan(plan_code_or_id: str | None) -> dict | None:
    if not plan_code_or_id:
        return None
    db = get_db()
    query: dict[str, Any] = {"code": plan_code_or_id}
    if ObjectId.is_valid(plan_code_or_id):
        query = {"$or": [{"code": plan_code_or_id}, {"_id": ObjectId(plan_code_or_id)}]}
    plan = await db.subscription_plans.find_one(query)
    return serialize_doc(plan) if plan else None


async def assert_plan_can_be_subscribed(tenant_id: str, plan: dict) -> None:
    if plan.get("allow_resubscribe", True):
        return
    db = get_db()
    plan_id = plan.get("id") or str(plan.get("_id", ""))
    plan_code = plan.get("code")
    clauses: list[dict[str, Any]] = []
    if plan_id:
        clauses.append({"plan_id": plan_id})
        if ObjectId.is_valid(plan_id):
            clauses.append({"plan_id": ObjectId(plan_id)})
    if plan_code:
        clauses.append({"plan_code": plan_code})
    if clauses and await db.subscriptions.find_one({"tenant_id": tenant_id, "$or": clauses}):
        raise HTTPException(status.HTTP_409_CONFLICT, "This plan has already been used for this shop. Please choose another plan.")


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


def _razorpay_plan_period(plan: dict) -> tuple[str, int]:
    plan_type = str(plan.get("plan_type") or "").lower()
    duration_minutes = int(plan.get("duration_minutes") or 0)
    duration_days = int(plan.get("duration_days") or 0)
    if duration_minutes > 0 or duration_days < 7:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Razorpay autopay cannot renew minute-based plans. Use one-time checkout, or set plan duration to at least 7 days for autopay.",
        )
    if plan_type in {"yearly", "annual"} or duration_days >= 365:
        return "yearly", 1
    if plan_type == "quarterly" or 80 <= duration_days <= 100:
        return "quarterly", 1
    if plan_type == "weekly" or 7 <= duration_days < 28:
        return "weekly", max(1, round(duration_days / 7))
    if plan_type == "daily" and duration_days >= 7:
        return "daily", duration_days
    return "monthly", max(1, round(duration_days / 30)) if duration_days >= 45 else 1


def _razorpay_total_count(period: str, interval: int, plan: dict) -> int:
    configured = int(plan.get("recurring_total_count") or 0)
    if configured > 0:
        return configured
    cycles_per_year = {"daily": 365, "weekly": 52, "monthly": 12, "quarterly": 4, "yearly": 1}
    return max(1, (cycles_per_year.get(period, 12) * 10) // max(interval, 1))


def _razorpay_plan_fingerprint(plan: dict) -> str:
    period, interval = _razorpay_plan_period(plan)
    amount_paise = int(round(float(plan.get("price") or 0) * 100))
    return f"{amount_paise}:{plan.get('currency', 'INR')}:{period}:{interval}:{plan.get('name')}"


async def ensure_razorpay_plan(plan: dict) -> str:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.")
    amount_paise = int(round(float(plan.get("price") or 0) * 100))
    if amount_paise < 100:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Razorpay recurring plans must be at least INR 1.00.")

    fingerprint = _razorpay_plan_fingerprint(plan)
    if plan.get("razorpay_plan_id") and plan.get("razorpay_plan_fingerprint") == fingerprint:
        return plan["razorpay_plan_id"]

    period, interval = _razorpay_plan_period(plan)
    payload = {
        "period": period,
        "interval": interval,
        "item": {
            "name": plan["name"],
            "amount": amount_paise,
            "currency": plan.get("currency", "INR"),
            "description": f"Sathi {plan['name']} subscription",
        },
        "notes": {"sathi_plan_id": plan["id"], "sathi_plan_code": plan["code"]},
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.razorpay.com/v1/plans",
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                json=payload,
            )
    except httpx.RequestError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Could not reach Razorpay: {exc.__class__.__name__}")
    if response.status_code >= 400:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Razorpay plan creation failed: {_razorpay_error_message(response)}")

    razorpay_plan = response.json()
    db = get_db()
    await db.subscription_plans.update_one(
        {"_id": ObjectId(plan["id"])},
        {"$set": {
            "razorpay_plan_id": razorpay_plan["id"],
            "razorpay_plan_fingerprint": fingerprint,
            "razorpay_plan": razorpay_plan,
            "updated_at": utc_now(),
        }},
    )
    return razorpay_plan["id"]


async def create_razorpay_subscription(tenant_id: str, user: dict, plan: dict) -> dict:
    razorpay_plan_id = await ensure_razorpay_plan(plan)
    period, interval = _razorpay_plan_period(plan)
    payload = {
        "plan_id": razorpay_plan_id,
        "total_count": _razorpay_total_count(period, interval, plan),
        "quantity": 1,
        "customer_notify": True,
        "notes": {
            "tenant_id": tenant_id,
            "user_id": user.get("id", ""),
            "sathi_plan_id": plan["id"],
            "sathi_plan_code": plan["code"],
        },
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.razorpay.com/v1/subscriptions",
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                json=payload,
            )
    except httpx.RequestError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Could not reach Razorpay: {exc.__class__.__name__}")
    if response.status_code >= 400:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Razorpay subscription creation failed: {_razorpay_error_message(response)}")
    return response.json()


def _datetime_from_unix(value: Any) -> datetime | None:
    if isinstance(value, (int, float)) and value > 0:
        return datetime.fromtimestamp(value, timezone.utc)
    return None


def subscription_is_usable(subscription: dict | None) -> bool:
    if not subscription:
        return False
    if subscription.get("status") == "lifetime":
        return True
    if subscription.get("status") not in {"trialing", "active", "past_due"}:
        return False
    now = utc_now()
    expiry = _as_datetime(subscription.get("expires_at"))
    return bool(expiry and expiry >= now)


def _as_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


async def assert_subscription_active(tenant_id: str) -> dict:
    subscription = await get_current_subscription(tenant_id, auto_create_pending=True)
    if not subscription_is_usable(subscription):
        db = get_db()
        now = utc_now()
        subscription_id = subscription.get("id") if subscription else None
        if subscription_id and ObjectId.is_valid(subscription_id):
            await db.subscriptions.update_one(
                {"_id": ObjectId(subscription_id), "tenant_id": tenant_id, "status": {"$ne": "expired"}},
                {"$set": {"status": "expired", "updated_at": now}},
            )
        await db.shops.update_one(
            {"_id": ObjectId(tenant_id)},
            {"$set": {"subscription_status": "expired", "updated_at": now}},
        )
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Subscription expired. Please renew to continue using the platform.",
        )
    return subscription


async def assert_feature_allowed(tenant_id: str, feature: str) -> dict:
    subscription = await assert_subscription_active(tenant_id)
    plan = await get_plan(subscription.get("plan_id") or subscription.get("plan_code"))
    features = set((plan or {}).get("features") or [])
    if feature not in features and "all" not in features:
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Your current plan does not include {feature}.")
    return subscription


async def assert_limit_available(tenant_id: str, limit_name: str) -> dict:
    subscription = await assert_subscription_active(tenant_id)
    plan = await get_plan(subscription.get("plan_id") or subscription.get("plan_code"))
    limits = (plan or {}).get("limits") or {}
    limit = limits.get(limit_name)
    if limit in (None, "", -1):
        return subscription
    db = get_db()
    if limit_name == "products":
        used = await db.products.count_documents({"tenant_id": tenant_id, "is_active": {"$ne": False}})
    elif limit_name == "monthly_invoices":
        now = utc_now()
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        used = await db.invoices.count_documents({"tenant_id": tenant_id, "created_at": {"$gte": start}})
    else:
        used = 0
    if used >= int(limit):
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, f"Plan limit reached for {limit_name}. Please upgrade.")
    return subscription


async def activate_subscription(
    tenant_id: str,
    plan_id: str,
    *,
    payment_status: str = "paid",
    created_by: str | None = None,
    auto_renew: bool = False,
    provider_subscription_id: str | None = None,
    provider_payment_id: str | None = None,
    provider_payload: dict | None = None,
) -> dict:
    db = get_db()
    plan = await get_plan(plan_id)
    if not plan or not plan.get("is_active", True):
        raise ValueError("Subscription plan is not available")
    now = utc_now()
    duration_minutes = int(plan.get("duration_minutes") or 0)
    duration_days = int(plan.get("duration_days") or 0)
    status_value = "lifetime" if plan.get("plan_type") == "lifetime" else "active"
    is_free_plan = float(plan.get("price") or 0) <= 0
    expires_at = None if status_value == "lifetime" else now + (timedelta(minutes=duration_minutes) if duration_minutes > 0 else timedelta(days=max(duration_days, 1)))
    doc = {
        "tenant_id": tenant_id,
        "plan_id": plan["id"],
        "plan_code": plan["code"],
        "plan_name": plan["name"],
        "plan_price": plan.get("price", 0),
        "is_free_plan": is_free_plan,
        "status": status_value,
        "starts_at": now,
        "expires_at": expires_at,
        "renews_at": expires_at if auto_renew else None,
        "grace_until": expires_at + timedelta(days=3) if expires_at else None,
        "auto_renew": auto_renew,
        "payment_status": payment_status,
        "provider": "razorpay" if provider_subscription_id or provider_payment_id else None,
        "provider_subscription_id": provider_subscription_id,
        "provider_payment_id": provider_payment_id,
        "provider_payload": provider_payload,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
        "history": [{"event": "activated", "at": now, "by": created_by, "plan": plan["code"]}],
    }
    await db.subscriptions.update_many({"tenant_id": tenant_id, "status": {"$in": ["pending", "trialing", "active", "past_due"]}}, {"$set": {"status": "replaced", "updated_at": now}})
    result = await db.subscriptions.insert_one(doc)
    shop_update = {"subscription_plan": plan["code"], "subscription_status": status_value, "subscription_expires_at": expires_at}
    await db.shops.update_one(
        {"_id": ObjectId(tenant_id)},
        {"$set": shop_update},
    )
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def activate_subscription_from_razorpay(
    tenant_id: str,
    plan_id: str,
    *,
    provider_subscription_id: str,
    provider_payment_id: str | None = None,
    created_by: str | None = None,
    provider_payload: dict | None = None,
) -> dict:
    return await activate_subscription(
        tenant_id,
        plan_id,
        payment_status="paid",
        created_by=created_by,
        auto_renew=True,
        provider_subscription_id=provider_subscription_id,
        provider_payment_id=provider_payment_id,
        provider_payload=provider_payload,
    )


async def log_activity(
    *,
    user_id: str | None,
    tenant_id: str | None,
    action: str,
    module: str,
    metadata: dict | None = None,
) -> None:
    db = get_db()
    now = utc_now()
    await db.activity_logs.insert_one({
        "user_id": user_id,
        "tenant_id": tenant_id,
        "action": action,
        "module": module,
        "metadata": metadata or {},
        "created_at": now,
    })
    if user_id and ObjectId.is_valid(user_id):
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"last_active_at": now}})
