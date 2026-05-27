from typing import Annotated, Optional
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_db
from app.core.permissions import Permission, has_permission
from app.core.security import decode_token
from app.models.base import serialize_doc
from app.services.subscription_service import assert_subscription_active

security = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
) -> dict:
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_token(creds.credentials)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token type")
    from bson import ObjectId

    db = get_db()
    try:
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except Exception:
        user = await db.users.find_one({"email": payload.get("email")})
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    if user.get("deleted_at"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deleted. Please contact Sathi support.")
    if not user.get("is_active", True):
        reason = user.get("status_reason")
        if not reason and user.get("tenant_id"):
            try:
                from bson import ObjectId
                shop = await db.shops.find_one({"_id": ObjectId(user["tenant_id"])})
                reason = (shop or {}).get("status_reason")
            except Exception:
                reason = None
        message = f"Your account is disabled. Reason: {reason}" if reason else "Your account is disabled. Please contact the administrator."
        raise HTTPException(status.HTTP_403_FORBIDDEN, message)
    if user.get("force_logout_at") and payload.get("iat"):
        issued_at_raw = payload.get("iat")
        issued_at = datetime.fromtimestamp(issued_at_raw, timezone.utc).replace(tzinfo=None) if isinstance(issued_at_raw, (int, float)) else None
        revoked_at = user["force_logout_at"].replace(tzinfo=None)
        if issued_at and revoked_at > issued_at:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session revoked")
    return serialize_doc(user)


def require_permission(permission: Permission):
    async def checker(user: Annotated[dict, Depends(get_current_user)]) -> dict:
        if not has_permission(user.get("role", ""), permission):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user

    return checker


async def get_tenant_id(user: Annotated[dict, Depends(get_current_user)]) -> str:
    tid = user.get("tenant_id")
    if not tid and user.get("role") != "super_admin":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No shop workspace")
    if tid and user.get("role") != "super_admin":
        await assert_subscription_active(tid)
    return tid


async def get_tenant_id_without_subscription_check(user: Annotated[dict, Depends(get_current_user)]) -> str:
    tid = user.get("tenant_id")
    if not tid and user.get("role") != "super_admin":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No shop workspace")
    return tid
