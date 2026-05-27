from typing import List, Optional

from pydantic import BaseModel, Field


class CartItem(BaseModel):
    product_id: str
    name: str
    sku: str
    quantity: float = Field(gt=0)
    unit_price: float
    tax_rate: float = 0
    discount: float = 0


class PaymentSplit(BaseModel):
    method: str  # cash, card, upi, credit
    amount: float = Field(ge=0)


class InvoiceCreate(BaseModel):
    items: List[CartItem]
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    discount_total: float = 0
    coupon_code: Optional[str] = None
    notes: Optional[str] = None
    payments: List[PaymentSplit]
    is_credit: bool = False


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    subtotal: float
    tax_total: float
    discount_total: float
    grand_total: float
    amount_paid: float
    amount_due: float
    status: str
    payment_methods: List[str]
    created_at: str
    items: List[dict]
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    notes: Optional[str] = None
    payments: List[dict] = []
