import re
from typing import Any, Optional

from bson import ObjectId

from app.core.database import get_db
from app.core.tenant import tenant_filter
from app.models.base import serialize_doc, utc_now
from app.schemas.product import ProductCreate, ProductUpdate


async def bulk_create_products(tenant_id: str, products: list[ProductCreate]) -> list[dict]:
    db = get_db()
    docs = []
    now = utc_now()
    
    # Pre-count for SKU generation
    current_count = await db.products.count_documents(tenant_filter(tenant_id))
    
    for i, data in enumerate(products):
        sku = data.sku or await _generate_sku(tenant_id, data.name, base_count=current_count + i + 1)
        margin = 0.0
        if data.buying_price > 0:
            margin = ((data.selling_price - data.buying_price) / data.buying_price) * 100

        doc: dict[str, Any] = {
            **data.model_dump(exclude={"variants"}, exclude_none=True),
            "tenant_id": tenant_id,
            "sku": sku,
            "profit_margin": round(margin, 2),
            "variants": [v.model_dump() for v in data.variants],
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        if data.expiry_date:
            doc["expiry_date"] = data.expiry_date
        docs.append(doc)
    
    if not docs:
        return []
        
    result = await db.products.insert_many(docs)
    for i, inserted_id in enumerate(result.inserted_ids):
        docs[i]["_id"] = inserted_id
        
    return [serialize_doc(d) for d in docs]


async def _generate_sku(tenant_id: str, name: str, base_count: int = None) -> str:
    db = get_db()
    prefix = re.sub(r"[^A-Z0-9]", "", name.upper())[:4] or "PRD"
    if base_count is None:
        base_count = await db.products.count_documents(tenant_filter(tenant_id)) + 1
    return f"{prefix}-{base_count:05d}"



async def create_product(tenant_id: str, data: ProductCreate) -> dict:
    products = await bulk_create_products(tenant_id, [data])
    return products[0] if products else {}


async def list_products(
    tenant_id: str,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    low_stock_only: bool = False,
) -> tuple[list[dict], int]:
    db = get_db()
    filt = tenant_filter(tenant_id, {"is_active": True})
    if category_id:
        filt["category_id"] = category_id
    if low_stock_only:
        filt["$expr"] = {"$lte": ["$quantity", "$low_stock_threshold"]}
    if search:
        filt["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
            {"barcode": search},
        ]
    total = await db.products.count_documents(filt)
    skip = (page - 1) * page_size
    cursor = db.products.find(filt).sort("created_at", -1).skip(skip).limit(page_size)
    items = [serialize_doc(d) async for d in cursor]
    return items, total


async def update_product(tenant_id: str, product_id: str, data: ProductUpdate) -> Optional[dict]:
    db = get_db()
    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not updates:
        return await get_product(tenant_id, product_id)
    if "buying_price" in updates or "selling_price" in updates:
        existing = await db.products.find_one(tenant_filter(tenant_id, {"_id": ObjectId(product_id)}))
        if existing:
            bp = updates.get("buying_price", existing.get("buying_price", 0))
            sp = updates.get("selling_price", existing.get("selling_price", 0))
            if bp > 0:
                updates["profit_margin"] = round(((sp - bp) / bp) * 100, 2)
    updates["updated_at"] = utc_now()
    result = await db.products.find_one_and_update(
        tenant_filter(tenant_id, {"_id": ObjectId(product_id)}),
        {"$set": updates},
        return_document=True,
    )
    return serialize_doc(result)


async def get_product(tenant_id: str, product_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.products.find_one(tenant_filter(tenant_id, {"_id": ObjectId(product_id)}))
    return serialize_doc(doc)


async def delete_product(tenant_id: str, product_id: str) -> bool:
    db = get_db()
    result = await db.products.update_one(
        tenant_filter(tenant_id, {"_id": ObjectId(product_id)}),
        {"$set": {"is_active": False, "updated_at": utc_now()}},
    )
    return result.modified_count > 0
