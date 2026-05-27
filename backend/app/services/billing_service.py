from typing import Any

from bson import ObjectId

from app.core.database import get_db
from app.core.tenant import tenant_filter
from app.models.base import serialize_doc, utc_now
from app.schemas.billing import InvoiceCreate


def _calc_line(item: dict) -> dict:
    subtotal = item["quantity"] * item["unit_price"]
    discount = item.get("discount", 0)
    taxable = subtotal - discount
    tax = taxable * (item.get("tax_rate", 0) / 100)
    return {**item, "line_subtotal": subtotal, "line_tax": tax, "line_total": taxable + tax}


def _normalize_identity(value: str | None) -> str:
    return " ".join((value or "").strip().lower().split())


async def _resolve_invoice_customer(tenant_id: str, data: InvoiceCreate, amount_due: float, now) -> dict | None:
    db = get_db()
    if data.customer_id:
        customer = await db.customers.find_one(tenant_filter(tenant_id, {"_id": ObjectId(data.customer_id)}))
        if not customer:
            raise ValueError("Customer not found")
        typed_phone = (data.customer_phone or "").strip()
        if typed_phone and customer.get("phone") and typed_phone != customer.get("phone"):
            raise ValueError(f"Selected customer mobile is {customer.get('phone')}. Clear selection or choose the correct customer.")
        typed_name = _normalize_identity(data.customer_name)
        existing_name = _normalize_identity(customer.get("name"))
        if typed_name and existing_name and typed_name != existing_name:
            raise ValueError(f"Mobile number belongs to existing customer '{customer.get('name')}'. Please select that customer or use another mobile number.")
        return customer

    phone = (data.customer_phone or "").strip()
    name = (data.customer_name or "").strip()
    if amount_due > 0 and not phone:
        raise ValueError("Customer mobile number is required for credit or partial payment bills")
    if not phone and not name:
        return None

    customer = await db.customers.find_one(tenant_filter(tenant_id, {"phone": phone})) if phone else None
    if customer:
        typed_name = _normalize_identity(name)
        existing_name = _normalize_identity(customer.get("name"))
        if typed_name and existing_name and typed_name != existing_name:
            raise ValueError(f"Mobile number {phone} already belongs to '{customer.get('name')}'. Select the existing customer or use a different mobile number.")
        updates = {"updated_at": now}
        if name and not customer.get("name"):
            updates["name"] = name
        await db.customers.update_one({"_id": customer["_id"]}, {"$set": updates})
        customer.update(updates)
        return customer

    doc = {
        "tenant_id": tenant_id,
        "name": name or phone,
        "phone": phone or None,
        "email": None,
        "address": None,
        "notes": "Auto-created from POS billing",
        "loyalty_points": 0,
        "credit_balance": 0,
        "total_spent": 0,
        "order_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.customers.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def create_invoice(tenant_id: str, user_id: str, data: InvoiceCreate) -> dict:
    db = get_db()
    shop = await db.shops.find_one({"_id": ObjectId(tenant_id)})
    if not shop:
        raise ValueError("Shop not found")

    product_ids = [ObjectId(i.product_id) for i in data.items]
    products = await db.products.find(tenant_filter(tenant_id, {"_id": {"$in": product_ids}})).to_list(len(product_ids))
    product_map = {str(p["_id"]): p for p in products}

    lines = []
    for item in data.items:
        product = product_map.get(item.product_id)
        if not product:
            raise ValueError(f"Product not found: {item.product_id}")
        if product.get("quantity", 0) < item.quantity:
            raise ValueError(f"Insufficient stock for {product.get('name', item.name)}")
        line = item.model_dump()
        line["buying_price"] = product.get("buying_price", 0)
        lines.append(_calc_line(line))
    subtotal = sum(l["line_subtotal"] for l in lines)
    tax_total = sum(l["line_tax"] for l in lines)
    discount_total = data.discount_total + sum(l.get("discount", 0) for l in lines)
    grand_total = subtotal + tax_total - discount_total
    amount_paid = sum(p.amount for p in data.payments)
    if amount_paid > grand_total:
        raise ValueError("Paid amount cannot be greater than invoice total")
    amount_due = max(0, grand_total - amount_paid)
    customer = await _resolve_invoice_customer(tenant_id, data, amount_due, utc_now())

    inv_settings = shop.get("invoice", {})
    prefix = inv_settings.get("prefix", "INV")
    num = inv_settings.get("next_number", 1)
    invoice_number = f"{prefix}-{num:06d}"

    status = "paid" if amount_due <= 0 else ("partial" if amount_paid > 0 else "pending")

    now = utc_now()
    customer_id = str(customer["_id"]) if customer else data.customer_id
    customer_name = (customer.get("name") if customer else None) or data.customer_name
    customer_phone = (customer.get("phone") if customer else None) or data.customer_phone
    doc: dict[str, Any] = {
        "tenant_id": tenant_id,
        "invoice_number": invoice_number,
        "items": lines,
        "customer_id": customer_id,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "subtotal": subtotal,
        "tax_total": tax_total,
        "discount_total": discount_total,
        "grand_total": grand_total,
        "amount_paid": amount_paid,
        "amount_due": amount_due,
        "payments": [p.model_dump() for p in data.payments],
        "payment_methods": [p.method for p in data.payments],
        "status": status,
        "notes": data.notes,
        "created_by": user_id,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.invoices.insert_one(doc)
    await db.shops.update_one({"_id": ObjectId(tenant_id)}, {"$inc": {"invoice.next_number": 1}})

    for line in lines:
        await db.products.update_one(
            tenant_filter(tenant_id, {"_id": ObjectId(line["product_id"])}),
            {"$inc": {"quantity": -line["quantity"]}},
        )
        await db.stock_movements.insert_one({
            "tenant_id": tenant_id,
            "product_id": line["product_id"],
            "type": "out",
            "quantity": line["quantity"],
            "reference": invoice_number,
            "created_at": now,
        })

    if customer_id:
        await db.customers.update_one(
            {"_id": ObjectId(customer_id), "tenant_id": tenant_id},
            {
                "$inc": {
                    "total_spent": grand_total,
                    "order_count": 1,
                    "credit_balance": amount_due,
                    "loyalty_points": int(amount_paid // 100),
                },
                "$set": {"last_purchase_at": now, "updated_at": now},
            },
        )

    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def update_invoice(tenant_id: str, invoice_id: str, user_id: str, data: InvoiceCreate) -> dict:
    db = get_db()
    existing = await db.invoices.find_one(tenant_filter(tenant_id, {"_id": ObjectId(invoice_id)}))
    if not existing:
        raise ValueError("Invoice not found")

    now = utc_now()
    for old_line in existing.get("items", []):
        await db.products.update_one(
            tenant_filter(tenant_id, {"_id": ObjectId(old_line["product_id"])}),
            {"$inc": {"quantity": old_line.get("quantity", 0)}},
        )

    product_ids = [ObjectId(i.product_id) for i in data.items]
    products = await db.products.find(tenant_filter(tenant_id, {"_id": {"$in": product_ids}})).to_list(len(product_ids))
    product_map = {str(p["_id"]): p for p in products}

    lines = []
    try:
        for item in data.items:
            product = product_map.get(item.product_id)
            if not product:
                raise ValueError(f"Product not found: {item.product_id}")
            if product.get("quantity", 0) < item.quantity:
                raise ValueError(f"Insufficient stock for {product.get('name', item.name)}")
            line = item.model_dump()
            line["buying_price"] = product.get("buying_price", 0)
            lines.append(_calc_line(line))
    except Exception:
        for old_line in existing.get("items", []):
            await db.products.update_one(
                tenant_filter(tenant_id, {"_id": ObjectId(old_line["product_id"])}),
                {"$inc": {"quantity": -old_line.get("quantity", 0)}},
            )
        raise

    subtotal = sum(l["line_subtotal"] for l in lines)
    tax_total = sum(l["line_tax"] for l in lines)
    discount_total = data.discount_total + sum(l.get("discount", 0) for l in lines)
    grand_total = subtotal + tax_total - discount_total
    amount_paid = sum(p.amount for p in data.payments)
    if amount_paid > grand_total:
        raise ValueError("Paid amount cannot be greater than invoice total")
    amount_due = max(0, grand_total - amount_paid)
    customer = await _resolve_invoice_customer(tenant_id, data, amount_due, now)
    customer_id = str(customer["_id"]) if customer else data.customer_id
    customer_name = (customer.get("name") if customer else None) or data.customer_name
    customer_phone = (customer.get("phone") if customer else None) or data.customer_phone
    status = "paid" if amount_due <= 0 else ("partial" if amount_paid > 0 else "pending")

    old_customer_id = existing.get("customer_id")
    if old_customer_id:
        await db.customers.update_one(
            {"_id": ObjectId(old_customer_id), "tenant_id": tenant_id},
            {
                "$inc": {
                    "total_spent": -float(existing.get("grand_total", 0)),
                    "order_count": -1,
                    "credit_balance": -float(existing.get("amount_due", 0)),
                },
                "$set": {"updated_at": now},
            },
        )

    if customer_id:
        await db.customers.update_one(
            {"_id": ObjectId(customer_id), "tenant_id": tenant_id},
            {
                "$inc": {
                    "total_spent": grand_total,
                    "order_count": 1,
                    "credit_balance": amount_due,
                },
                "$set": {"last_purchase_at": now, "updated_at": now},
            },
        )

    for line in lines:
        await db.products.update_one(
            tenant_filter(tenant_id, {"_id": ObjectId(line["product_id"])}),
            {"$inc": {"quantity": -line["quantity"]}},
        )

    updates = {
        "items": lines,
        "customer_id": customer_id,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "subtotal": subtotal,
        "tax_total": tax_total,
        "discount_total": discount_total,
        "grand_total": grand_total,
        "amount_paid": amount_paid,
        "amount_due": amount_due,
        "payments": [p.model_dump() for p in data.payments],
        "payment_methods": [p.method for p in data.payments],
        "status": status,
        "notes": data.notes,
        "edited_by": user_id,
        "edited_at": now,
        "updated_at": now,
    }
    await db.invoice_edits.insert_one({
        "tenant_id": tenant_id,
        "invoice_id": invoice_id,
        "invoice_number": existing.get("invoice_number"),
        "before": serialize_doc(existing),
        "after": updates,
        "edited_by": user_id,
        "created_at": now,
    })
    updated = await db.invoices.find_one_and_update(
        tenant_filter(tenant_id, {"_id": ObjectId(invoice_id)}),
        {"$set": updates},
        return_document=True,
    )
    return serialize_doc(updated)


async def get_dashboard_stats(tenant_id: str) -> dict:
    db = get_db()
    from datetime import timedelta

    now = utc_now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start.replace(day=1)

    pipeline_today = [
        {"$match": {"tenant_id": tenant_id, "created_at": {"$gte": today_start}}},
        {"$group": {"_id": None, "sales": {"$sum": "$grand_total"}, "count": {"$sum": 1}}},
    ]
    today = await db.invoices.aggregate(pipeline_today).to_list(1)
    today_sales = today[0]["sales"] if today else 0
    today_count = today[0]["count"] if today else 0

    pipeline_month = [
        {"$match": {"tenant_id": tenant_id, "created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "revenue": {"$sum": "$grand_total"}}},
    ]
    month = await db.invoices.aggregate(pipeline_month).to_list(1)
    month_revenue = month[0]["revenue"] if month else 0

    low_stock = await db.products.count_documents(
        tenant_filter(tenant_id, {"$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}, "is_active": True})
    )
    total_products = await db.products.count_documents(tenant_filter(tenant_id, {"is_active": True}))
    pending_payments = await db.invoices.count_documents(tenant_filter(tenant_id, {"status": {"$in": ["pending", "partial"]}}))
    customers = await db.customers.count_documents(tenant_filter(tenant_id))

    recent = await db.invoices.find(tenant_filter(tenant_id)).sort("created_at", -1).limit(10).to_list(10)

    top_products = await db.invoices.aggregate([
        {"$match": {"tenant_id": tenant_id, "created_at": {"$gte": week_start}}},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.name", "qty": {"$sum": "$items.quantity"}, "revenue": {"$sum": "$items.line_total"}}},
        {"$sort": {"revenue": -1}},
        {"$limit": 5},
    ]).to_list(5)

    return {
        "today_sales": today_sales,
        "today_orders": today_count,
        "month_revenue": month_revenue,
        "low_stock_count": low_stock,
        "total_products": total_products,
        "pending_payments": pending_payments,
        "customer_count": customers,
        "recent_transactions": [serialize_doc(r) for r in recent],
        "top_products": [{"name": t["_id"], "quantity": t["qty"], "revenue": t["revenue"]} for t in top_products],
    }


async def reconcile_customer_payments(tenant_id: str) -> dict:
    db = get_db()
    payments = await db.customer_payments.find(
        tenant_filter(tenant_id, {"$or": [{"applied_invoices": {"$exists": False}}, {"applied_invoices": []}]})
    ).sort("created_at", 1).to_list(1000)
    touched_customers = set()
    reconciled = 0

    for payment in payments:
        customer_id = payment.get("customer_id")
        if not customer_id:
            continue
        remaining = float(payment.get("amount", 0))
        applied_invoices = []
        unpaid_invoices = await db.invoices.find(
            tenant_filter(
                tenant_id,
                {
                    "customer_id": customer_id,
                    "status": {"$in": ["pending", "partial"]},
                    "amount_due": {"$gt": 0},
                },
            )
        ).sort("created_at", 1).to_list(500)
        for invoice in unpaid_invoices:
            if remaining <= 0:
                break
            invoice_due = float(invoice.get("amount_due", 0))
            applied = min(remaining, invoice_due)
            new_due = max(0, invoice_due - applied)
            new_paid = float(invoice.get("amount_paid", 0)) + applied
            await db.invoices.update_one(
                {"_id": invoice["_id"], "tenant_id": tenant_id},
                {
                    "$set": {
                        "amount_paid": new_paid,
                        "amount_due": new_due,
                        "status": "paid" if new_due <= 0 else "partial",
                        "updated_at": utc_now(),
                    },
                    "$push": {
                        "payments": {
                            "method": payment.get("method", "cash"),
                            "amount": applied,
                            "type": "credit_collection",
                            "receipt_reference": str(payment["_id"]),
                            "created_at": payment.get("created_at", utc_now()),
                        }
                    },
                    "$addToSet": {"payment_methods": payment.get("method", "cash")},
                },
            )
            applied_invoices.append({
                "invoice_id": str(invoice["_id"]),
                "invoice_number": invoice.get("invoice_number"),
                "amount": applied,
                "remaining_due": new_due,
            })
            remaining -= applied
        if applied_invoices:
            await db.customer_payments.update_one(
                {"_id": payment["_id"], "tenant_id": tenant_id},
                {"$set": {"applied_invoices": applied_invoices, "remaining_balance": max(0, remaining), "reconciled_at": utc_now()}},
            )
            touched_customers.add(customer_id)
            reconciled += 1

    for customer_id in touched_customers:
        open_invoices = await db.invoices.find(
            tenant_filter(tenant_id, {"customer_id": customer_id, "amount_due": {"$gt": 0}})
        ).to_list(500)
        balance = sum(float(inv.get("amount_due", 0)) for inv in open_invoices)
        await db.customers.update_one(
            {"_id": ObjectId(customer_id), "tenant_id": tenant_id},
            {"$set": {"credit_balance": balance, "updated_at": utc_now()}},
        )

    return {"reconciled_payments": reconciled, "customers_updated": len(touched_customers)}
