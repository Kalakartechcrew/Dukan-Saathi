from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    _db = _client[settings.MONGODB_DB_NAME]
    await _ensure_indexes()


async def close_db() -> None:
    global _client, _db
    if _client:
        _client.close()
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db


async def _ensure_indexes() -> None:
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.users.create_index([("tenant_id", 1), ("role", 1)])
    await db.shops.create_index("slug", unique=True)
    await db.products.create_index([("tenant_id", 1), ("sku", 1)], unique=True)
    await db.products.create_index([("tenant_id", 1), ("barcode", 1)])
    await db.products.create_index([("tenant_id", 1), ("name", "text"), ("sku", "text")])
    await db.invoices.create_index([("tenant_id", 1), ("invoice_number", 1)], unique=True)
    await db.invoices.create_index([("tenant_id", 1), ("created_at", -1)])
    await db.customers.create_index([("tenant_id", 1), ("phone", 1)])
    await db.customer_payments.create_index([("tenant_id", 1), ("customer_id", 1), ("created_at", -1)])
    await db.bill_file_uploads.create_index([("status", 1), ("delete_after", 1)])
    await db.bill_file_uploads.create_index([("tenant_id", 1), ("created_at", -1)])
    await db.invoice_edits.create_index([("tenant_id", 1), ("invoice_id", 1), ("created_at", -1)])
    await db.expenses.create_index([("tenant_id", 1), ("expense_date", -1)])
    await db.expenses.create_index([("tenant_id", 1), ("category", 1)])
    await db.stock_movements.create_index([("tenant_id", 1), ("created_at", -1)])
    await db.notifications.create_index([("tenant_id", 1), ("user_id", 1), ("read", 1)])
    await db.audit_logs.create_index([("tenant_id", 1), ("created_at", -1)])
    await db.activity_logs.create_index([("tenant_id", 1), ("created_at", -1)])
    await db.activity_logs.create_index([("user_id", 1), ("created_at", -1)])
    await db.login_history.create_index([("user_id", 1), ("created_at", -1)])
    await db.sessions.create_index([("user_id", 1), ("is_active", 1)])
    await db.subscription_plans.create_index("code", unique=True)
    await db.subscription_plans.create_index([("is_active", 1), ("price", 1)])
    await db.subscriptions.create_index([("tenant_id", 1), ("status", 1), ("expires_at", 1)])
    await db.subscriptions.create_index([("expires_at", 1), ("status", 1)])
    await db.subscription_payments.create_index([("tenant_id", 1), ("created_at", -1)])
    await db.subscription_payments.create_index("provider_payment_id", unique=True, sparse=True)

    from app.services.subscription_service import ensure_default_plans

    await ensure_default_plans()
    await _ensure_super_admin()


async def _ensure_super_admin() -> None:
    if not settings.SUPER_ADMIN_PASSWORD:
        return
    db = get_db()
    if await db.users.find_one({"email": settings.SUPER_ADMIN_EMAIL.lower()}):
        return
    from app.core.security import hash_password
    from app.models.base import utc_now

    now = utc_now()
    await db.users.insert_one({
        "email": settings.SUPER_ADMIN_EMAIL.lower(),
        "password_hash": hash_password(settings.SUPER_ADMIN_PASSWORD),
        "full_name": "Super Admin",
        "phone": None,
        "role": "super_admin",
        "tenant_id": None,
        "is_active": True,
        "is_verified": True,
        "refresh_tokens": [],
        "created_at": now,
        "updated_at": now,
    })
