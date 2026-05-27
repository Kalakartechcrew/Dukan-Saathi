from typing import Annotated, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from app.api.deps import get_tenant_id, require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.core.tenant import tenant_filter
from app.models.base import serialize_doc, utc_now
from app.schemas.common import PaginatedResponse
from app.services.invoice_template import render_payment_receipt_html, render_payment_receipt_pdf
from app.services.whatsapp_service import (
    WhatsAppConfigurationError,
    WhatsAppDeliveryError,
    send_pdf_via_whatsapp_template,
    whatsapp_bills_enabled,
)

router = APIRouter(prefix="/customers", tags=["Customers"])


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1)
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CustomerResponse(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    loyalty_points: float = 0
    credit_balance: float = 0
    total_spent: float = 0
    order_count: int = 0


class CustomerPaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    method: str = "cash"
    notes: Optional[str] = None


@router.get("", response_model=PaginatedResponse[CustomerResponse])
async def list_customers(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.CUSTOMERS_MANAGE))],
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
):
    db = get_db()
    filt = tenant_filter(tenant_id)
    if search:
        filt["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]
    total = await db.customers.count_documents(filt)
    items = await db.customers.find(filt).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return PaginatedResponse(
        items=[CustomerResponse(**serialize_doc(c)) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=CustomerResponse)
async def create_customer(
    body: CustomerCreate,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.CUSTOMERS_MANAGE))],
):
    db = get_db()
    if body.phone:
        existing = await db.customers.find_one(tenant_filter(tenant_id, {"phone": body.phone.strip()}))
        if existing:
            raise HTTPException(400, f"Mobile number already belongs to customer '{existing.get('name')}'")
    doc = {**body.model_dump(), "phone": body.phone.strip() if body.phone else None, "tenant_id": tenant_id, "loyalty_points": 0, "credit_balance": 0,
           "total_spent": 0, "order_count": 0, "created_at": utc_now(), "updated_at": utc_now()}
    result = await db.customers.insert_one(doc)
    doc["_id"] = result.inserted_id
    return CustomerResponse(**serialize_doc(doc))


@router.post("/{customer_id}/payments")
async def record_customer_payment(
    customer_id: str,
    body: CustomerPaymentCreate,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.CUSTOMERS_MANAGE))],
):
    db = get_db()
    customer = await db.customers.find_one(tenant_filter(tenant_id, {"_id": ObjectId(customer_id)}))
    if not customer:
        raise HTTPException(404, "Customer not found")

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

    invoice_due_total = sum(float(inv.get("amount_due", 0)) for inv in unpaid_invoices)
    current_due = max(float(customer.get("credit_balance", 0)), invoice_due_total)
    if body.amount > current_due:
        raise HTTPException(400, "Payment cannot be greater than customer outstanding balance")

    now = utc_now()
    receipt_id = ObjectId()
    receipt_reference = str(receipt_id)
    remaining_to_apply = body.amount
    applied_invoices = []
    for invoice in unpaid_invoices:
        if remaining_to_apply <= 0:
            break
        invoice_due = float(invoice.get("amount_due", 0))
        applied = min(remaining_to_apply, invoice_due)
        new_due = max(0, invoice_due - applied)
        new_paid = float(invoice.get("amount_paid", 0)) + applied
        new_status = "paid" if new_due <= 0 else "partial"
        payment_line = {
            "method": body.method,
            "amount": applied,
            "type": "credit_collection",
            "receipt_reference": receipt_reference,
            "created_at": now,
        }
        await db.invoices.update_one(
            {"_id": invoice["_id"], "tenant_id": tenant_id},
            {
                "$set": {
                    "amount_paid": new_paid,
                    "amount_due": new_due,
                    "status": new_status,
                    "updated_at": now,
                },
                "$push": {"payments": payment_line},
                "$addToSet": {"payment_methods": body.method},
            },
        )
        applied_invoices.append({
            "invoice_id": str(invoice["_id"]),
            "invoice_number": invoice.get("invoice_number"),
            "amount": applied,
            "remaining_due": new_due,
        })
        remaining_to_apply -= applied

    remaining_balance = max(0, current_due - body.amount)
    payment_doc = {
        "_id": receipt_id,
        "tenant_id": tenant_id,
        "receipt_number": f"RCPT-{receipt_reference[-8:].upper()}",
        "customer_id": customer_id,
        "customer_name": customer.get("name"),
        "customer_phone": customer.get("phone"),
        "amount": body.amount,
        "method": body.method,
        "notes": body.notes,
        "previous_balance": current_due,
        "remaining_balance": remaining_balance,
        "applied_invoices": applied_invoices,
        "created_at": now,
    }
    result = await db.customer_payments.insert_one(payment_doc)
    await db.customers.update_one(
        {"_id": ObjectId(customer_id), "tenant_id": tenant_id},
        {"$set": {"credit_balance": remaining_balance, "last_payment_at": now, "updated_at": now}},
    )
    return {"message": "Payment recorded", "remaining_balance": remaining_balance, "payment": serialize_doc(payment_doc)}


@router.get("/payments/{payment_id}/html", response_class=HTMLResponse)
async def payment_receipt_html(
    payment_id: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.CUSTOMERS_MANAGE))],
):
    db = get_db()
    payment = await db.customer_payments.find_one(tenant_filter(tenant_id, {"_id": ObjectId(payment_id)}))
    shop = await db.shops.find_one({"_id": ObjectId(tenant_id)})
    if not payment or not shop:
        raise HTTPException(404, "Payment receipt not found")
    return HTMLResponse(render_payment_receipt_html(serialize_doc(shop), serialize_doc(payment)))


@router.post("/payments/{payment_id}/whatsapp-pdf")
async def payment_receipt_whatsapp_pdf(
    payment_id: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.CUSTOMERS_MANAGE))],
):
    db = get_db()
    payment = await db.customer_payments.find_one(tenant_filter(tenant_id, {"_id": ObjectId(payment_id)}))
    shop = await db.shops.find_one({"_id": ObjectId(tenant_id)})
    if not payment or not shop:
        raise HTTPException(404, "Payment receipt not found")

    payment_doc = serialize_doc(payment)
    shop_doc = serialize_doc(shop)
    if not whatsapp_bills_enabled(shop_doc):
        raise HTTPException(400, "WhatsApp bill sharing is turned off in shop settings")

    customer_phone = payment_doc.get("customer_phone")
    if not customer_phone:
        raise HTTPException(400, "Customer mobile number is required to send payment receipt on WhatsApp")

    receipt_number = payment_doc.get("receipt_number", "receipt")
    pdf = render_payment_receipt_pdf(shop_doc, payment_doc)
    try:
        result = await send_pdf_via_whatsapp_template(
            tenant_id=tenant_id,
            recipient_phone=customer_phone,
            amount=f"{float(payment_doc.get('amount') or 0):.2f}",
            pdf=pdf,
            filename=f"{receipt_number}.pdf",
            document_number=receipt_number,
            shop_name=shop_doc.get("name", "shop"),
            kind="receipt",
        )
    except WhatsAppConfigurationError as exc:
        raise HTTPException(503, str(exc))
    except WhatsAppDeliveryError as exc:
        raise HTTPException(502, str(exc))
    return {
        "status": "sent",
        "message_id": result.message_id,
        "recipient": result.recipient,
        "payment_id": payment_doc["id"],
    }


@router.get("/{customer_id}/ledger")
async def customer_ledger(
    customer_id: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.CUSTOMERS_MANAGE))],
):
    db = get_db()
    invoices = await db.invoices.find(tenant_filter(tenant_id, {"customer_id": customer_id})).sort("created_at", -1).limit(100).to_list(100)
    payments = await db.customer_payments.find(tenant_filter(tenant_id, {"customer_id": customer_id})).sort("created_at", -1).limit(100).to_list(100)
    return {
        "invoices": [serialize_doc(item) for item in invoices],
        "payments": [serialize_doc(item) for item in payments],
    }
