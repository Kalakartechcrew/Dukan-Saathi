from datetime import timedelta

from bson import ObjectId

from app.core.database import get_db
from app.models.base import utc_now


REMINDER_OFFSETS = [
    ("1d", timedelta(days=1), "Subscription expires in 1 day", "Your Sathi subscription expires in 1 day. Renew now to avoid interruption.", "normal"),
    ("5h", timedelta(hours=5), "Subscription expires in 5 hours", "Your Sathi subscription expires in 5 hours. Renew now to keep using the platform.", "high"),
    ("30m", timedelta(minutes=30), "Subscription expires in 30 minutes", "Your Sathi subscription expires in 30 minutes. Renew immediately to avoid losing access.", "high"),
]


async def run_subscription_reminders() -> dict:
    db = get_db()
    now = utc_now()
    created = 0
    for code, offset, title, message, severity in REMINDER_OFFSETS:
        due_at = now + offset
        subs = await db.subscriptions.find({
            "status": {"$in": ["trialing", "active", "past_due"]},
            "expires_at": {"$gt": now, "$lte": due_at},
        }).to_list(None)
        for sub in subs:
            key = f"subscription_expiry_{code}_{sub['tenant_id']}_{sub['_id']}"
            if await db.notifications.find_one({"automation_key": key}):
                continue
            await db.notifications.insert_one({
                "tenant_id": sub["tenant_id"],
                "user_id": None,
                "title": title,
                "message": message,
                "type": "subscription_reminder",
                "severity": severity,
                "read": False,
                "automation_key": key,
                "created_at": now,
            })
            created += 1

    expired = await db.subscriptions.update_many(
        {
            "status": {"$in": ["trialing", "active", "past_due"]},
            "expires_at": {"$lt": now},
        },
        {"$set": {"status": "expired", "updated_at": now}},
    )
    expired_subs = await db.subscriptions.find({
        "status": "expired",
        "expires_at": {"$lt": now},
    }).to_list(None)
    for sub in expired_subs:
        tenant_id = sub.get("tenant_id")
        if tenant_id and ObjectId.is_valid(tenant_id):
            await db.shops.update_one(
                {"_id": ObjectId(tenant_id), "subscription_status": {"$ne": "expired"}},
                {"$set": {"subscription_status": "expired", "updated_at": now}},
            )
    return {"reminders_created": created, "subscriptions_expired": expired.modified_count}
