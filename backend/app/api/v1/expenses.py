from datetime import datetime
from typing import Annotated, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.deps import get_tenant_id, require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.core.tenant import tenant_filter
from app.models.base import serialize_doc, utc_now
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/expenses", tags=["Expenses"])


class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1)
    category: str = "general"
    amount: float = Field(gt=0)
    payment_method: str = "cash"
    vendor: Optional[str] = None
    notes: Optional[str] = None
    expense_date: Optional[datetime] = None


class ExpenseResponse(BaseModel):
    id: str
    title: str
    category: str
    amount: float
    payment_method: str
    vendor: Optional[str] = None
    expense_date: str
    created_at: str


@router.get("", response_model=PaginatedResponse[ExpenseResponse])
async def list_expenses(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.EXPENSES_MANAGE))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
):
    db = get_db()
    filt = tenant_filter(tenant_id)
    if category:
        filt["category"] = category
    total = await db.expenses.count_documents(filt)
    items = await db.expenses.find(filt).sort("expense_date", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return PaginatedResponse(
        items=[ExpenseResponse(**serialize_doc(item)) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=ExpenseResponse)
async def create_expense(
    body: ExpenseCreate,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.EXPENSES_MANAGE))],
):
    db = get_db()
    now = utc_now()
    doc = {**body.model_dump(), "tenant_id": tenant_id, "expense_date": body.expense_date or now, "created_at": now, "updated_at": now}
    result = await db.expenses.insert_one(doc)
    doc["_id"] = result.inserted_id
    return ExpenseResponse(**serialize_doc(doc))


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.EXPENSES_MANAGE))],
):
    db = get_db()
    result = await db.expenses.delete_one(tenant_filter(tenant_id, {"_id": ObjectId(expense_id)}))
    if result.deleted_count == 0:
        raise HTTPException(404, "Expense not found")
    return {"message": "Expense deleted"}
