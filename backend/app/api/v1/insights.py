from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_tenant_id, require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.core.tenant import tenant_filter

router = APIRouter(prefix="/insights", tags=["AI Insights"])


@router.get("/reorder-suggestions")
async def reorder_suggestions(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.REPORTS_VIEW))],
):
    db = get_db()
    suggestions = await db.products.aggregate([
        {"$match": tenant_filter(tenant_id, {"is_active": True, "$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}})},
        {"$project": {
            "name": 1,
            "sku": 1,
            "quantity": 1,
            "low_stock_threshold": 1,
            "suggested_order_qty": {"$max": [{"$multiply": ["$low_stock_threshold", 3]}, 10]},
            "reason": "Stock is at or below threshold",
        }},
        {"$limit": 25},
    ]).to_list(25)
    for item in suggestions:
        item["id"] = str(item.pop("_id"))
    return suggestions


@router.get("/business-summary")
async def business_summary(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.DASHBOARD_VIEW))],
):
    db = get_db()
    unpaid = await db.invoices.count_documents(tenant_filter(tenant_id, {"status": {"$in": ["pending", "partial"]}}))
    low_stock = await db.products.count_documents(tenant_filter(tenant_id, {"is_active": True, "$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}}))
    customer_count = await db.customers.count_documents(tenant_filter(tenant_id))
    insights = []
    if low_stock:
        insights.append({"type": "inventory", "title": "Reorder attention needed", "message": f"{low_stock} products are below their stock threshold."})
    if unpaid:
        insights.append({"type": "cashflow", "title": "Pending collections", "message": f"{unpaid} invoices still have outstanding balances."})
    if customer_count == 0:
        insights.append({"type": "crm", "title": "Start building CRM data", "message": "Attach customers to invoices to unlock loyalty and segmentation."})
    return {"insights": insights}
