from typing import Annotated, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.deps import get_current_user, get_tenant_id
from app.core.database import get_db
from app.core.tenant import tenant_filter
from app.models.base import serialize_doc, utc_now

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"
    severity: str = "normal"
    action_url: Optional[str] = None


@router.get("")
async def list_notifications(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    user: Annotated[dict, Depends(get_current_user)],
    unread_only: bool = Query(False),
):
    db = get_db()
    filt = tenant_filter(tenant_id, {"$or": [{"user_id": user["id"]}, {"user_id": None}]})
    if unread_only:
        filt["read"] = False
    items = await db.notifications.find(filt).sort("created_at", -1).limit(50).to_list(50)
    return [serialize_doc(item) for item in items]


@router.post("")
async def create_notification(
    body: NotificationCreate,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    user: Annotated[dict, Depends(get_current_user)],
):
    db = get_db()
    doc = {
        **body.model_dump(),
        "tenant_id": tenant_id,
        "user_id": user["id"],
        "read": False,
        "created_at": utc_now(),
    }
    result = await db.notifications.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    user: Annotated[dict, Depends(get_current_user)],
):
    db = get_db()
    await db.notifications.update_one(
        tenant_filter(tenant_id, {"_id": ObjectId(notification_id), "$or": [{"user_id": user["id"]}, {"user_id": None}]}),
        {"$set": {"read": True, "read_at": utc_now()}},
    )
    return {"message": "Notification marked as read"}
