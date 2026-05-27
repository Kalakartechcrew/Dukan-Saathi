from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user, get_tenant_id, require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.models.base import serialize_doc, utc_now
from app.schemas.shop import ShopResponse, ShopSetupRequest, ShopUpdateRequest

router = APIRouter(prefix="/shops", tags=["Shops"])


@router.get("/me", response_model=ShopResponse)
async def get_my_shop(tenant_id: Annotated[str, Depends(get_tenant_id)]):
    db = get_db()
    shop = await db.shops.find_one({"_id": ObjectId(tenant_id)})
    if not shop:
        raise HTTPException(404, "Shop not found")
    s = serialize_doc(shop)
    return ShopResponse(
        id=s["id"],
        name=s["name"],
        slug=s["slug"],
        business_type=s.get("business_type", "general_store"),
        currency=s.get("currency", "INR"),
        timezone=s.get("timezone", "Asia/Kolkata"),
        address=s.get("address"),
        city=s.get("city"),
        state=s.get("state"),
        country=s.get("country", "IN"),
        phone=s.get("phone"),
        branding=s.get("branding", {}),
        tax=s.get("tax", {}),
        invoice=s.get("invoice", {}),
        payment=s.get("payment", {}),
        subscription_plan=s.get("subscription_plan", "free"),
        onboarding_completed=s.get("onboarding_completed", False),
    )


@router.post("/setup", response_model=ShopResponse)
async def setup_shop(
    body: ShopSetupRequest,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.SETTINGS_MANAGE))],
):
    db = get_db()
    existing = await db.shops.find_one({"_id": ObjectId(tenant_id)})
    if not existing:
        raise HTTPException(404, "Shop not found")
    branding = {**existing.get("branding", {}), **body.branding.model_dump(exclude_none=True)}
    tax = {**existing.get("tax", {}), **body.tax.model_dump(exclude_none=True)}
    payment = {**existing.get("payment", {}), **(body.payment.model_dump(exclude_none=True) if body.payment else {})}
    updates = {
        "business_type": body.business_type,
        "currency": body.currency,
        "timezone": body.timezone,
        "address": body.address,
        "city": body.city,
        "state": body.state,
        "country": body.country,
        "phone": body.phone,
        "tax": tax,
        "branding": branding,
        "payment": payment,
        "onboarding_completed": True,
        "updated_at": utc_now(),
    }
    shop = await db.shops.find_one_and_update(
        {"_id": ObjectId(tenant_id)},
        {"$set": updates},
        return_document=True,
    )
    s = serialize_doc(shop)
    return ShopResponse(id=s["id"], name=s["name"], slug=s["slug"], **{k: s.get(k) for k in [
        "business_type", "currency", "timezone", "address", "city", "state", "country", "phone", "branding", "tax", "invoice", "payment",
        "subscription_plan", "onboarding_completed"
    ]})


@router.patch("/me", response_model=ShopResponse)
async def update_shop(
    body: ShopUpdateRequest,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.SETTINGS_MANAGE))],
):
    db = get_db()
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    existing = await db.shops.find_one({"_id": ObjectId(tenant_id)})
    if not existing:
        raise HTTPException(404, "Shop not found")
    if "branding" in updates:
        updates["branding"] = {**existing.get("branding", {}), **updates["branding"]}
    if "tax" in updates:
        updates["tax"] = {**existing.get("tax", {}), **updates["tax"]}
    if "invoice" in updates:
        updates["invoice"] = {**existing.get("invoice", {}), **updates["invoice"]}
    if "payment" in updates:
        updates["payment"] = {**existing.get("payment", {}), **updates["payment"]}
    updates["updated_at"] = utc_now()
    shop = await db.shops.find_one_and_update(
        {"_id": ObjectId(tenant_id)}, {"$set": updates}, return_document=True
    )
    s = serialize_doc(shop)
    return ShopResponse(
        id=s["id"], name=s["name"], slug=s["slug"],
        business_type=s.get("business_type"), currency=s.get("currency"),
        timezone=s.get("timezone"), address=s.get("address"), city=s.get("city"), state=s.get("state"),
        country=s.get("country", "IN"), phone=s.get("phone"),
        branding=s.get("branding", {}), tax=s.get("tax", {}), invoice=s.get("invoice", {}),
        payment=s.get("payment", {}),
        onboarding_completed=s.get("onboarding_completed", False),
    )
