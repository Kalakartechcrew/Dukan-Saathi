from typing import Annotated, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import get_tenant_id, require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.core.tenant import tenant_filter
from app.models.base import serialize_doc, utc_now

router = APIRouter(prefix="/categories", tags=["Categories"])


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1)
    description: Optional[str] = None
    parent_id: Optional[str] = None


@router.get("")
async def list_categories(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.PRODUCTS_MANAGE))],
):
    db = get_db()
    items = await db.categories.find(tenant_filter(tenant_id)).sort("name", 1).to_list(500)
    return [serialize_doc(c) for c in items]


@router.post("")
async def create_category(
    body: CategoryCreate,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.PRODUCTS_MANAGE))],
):
    db = get_db()
    doc = {**body.model_dump(), "tenant_id": tenant_id, "created_at": utc_now()}
    result = await db.categories.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)
