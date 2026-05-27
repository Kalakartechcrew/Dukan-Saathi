from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ShopBranding(BaseModel):
    logo_url: Optional[str] = None
    primary_color: str = "#6366f1"
    accent_color: str = "#8b5cf6"


class TaxSettings(BaseModel):
    gst_enabled: bool = True
    gst_number: Optional[str] = None
    vat_number: Optional[str] = None
    default_tax_rate: float = 0.0
    tax_inclusive: bool = False


class InvoiceSettings(BaseModel):
    prefix: str = "INV"
    next_number: int = 1
    template_id: str = "modern"
    terms: Optional[str] = None
    footer_note: Optional[str] = None


class PaymentSettings(BaseModel):
    upi_id: Optional[str] = None
    upi_name: Optional[str] = None
    show_upi_qr_on_invoice: bool = False
    whatsapp_bill_enabled: bool = True


class ShopSetupRequest(BaseModel):
    business_type: str
    currency: str = "INR"
    timezone: str = "Asia/Kolkata"
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "IN"
    phone: Optional[str] = None
    tax: TaxSettings = TaxSettings()
    branding: ShopBranding = ShopBranding()
    payment: Optional[PaymentSettings] = None


class ShopResponse(BaseModel):
    id: str
    name: str
    slug: str
    business_type: str
    currency: str
    timezone: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "IN"
    phone: Optional[str] = None
    branding: ShopBranding
    tax: TaxSettings
    invoice: InvoiceSettings
    payment: PaymentSettings = PaymentSettings()
    subscription_plan: str = "free"
    onboarding_completed: bool = False


class ShopUpdateRequest(BaseModel):
    name: Optional[str] = None
    business_type: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    branding: Optional[ShopBranding] = None
    tax: Optional[TaxSettings] = None
    invoice: Optional[InvoiceSettings] = None
    payment: Optional[PaymentSettings] = None
