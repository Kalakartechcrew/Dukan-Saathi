# MongoDB Schema Design

All tenant-scoped collections include `tenant_id: ObjectId` (shop ID).

## users

```json
{
  "_id": "ObjectId",
  "email": "string (unique)",
  "password_hash": "string",
  "full_name": "string",
  "phone": "string?",
  "role": "owner|manager|cashier|staff|super_admin",
  "tenant_id": "ObjectId?",
  "is_active": true,
  "is_verified": false,
  "refresh_tokens": [{ "token": "string", "created_at": "datetime" }],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Indexes**: `email` (unique), `(tenant_id, role)`

## shops (tenants)

```json
{
  "_id": "ObjectId (= tenant_id)",
  "name": "string",
  "slug": "string (unique)",
  "business_type": "grocery|pharmacy|...",
  "currency": "INR",
  "timezone": "Asia/Kolkata",
  "branding": { "logo_url", "primary_color", "accent_color" },
  "tax": { "gst_enabled", "gst_number", "default_tax_rate", "tax_inclusive" },
  "invoice": { "prefix", "next_number", "template_id", "terms", "footer_note" },
  "subscription_plan": "free|pro|enterprise",
  "onboarding_completed": false
}
```

## products

```json
{
  "tenant_id": "ObjectId",
  "name": "string",
  "sku": "string",
  "barcode": "string?",
  "category_id": "ObjectId?",
  "buying_price": 0,
  "selling_price": 0,
  "profit_margin": 0,
  "quantity": 0,
  "unit": "piece|kg|liter",
  "tax_rate": 0,
  "images": ["url"],
  "variants": [],
  "low_stock_threshold": 5,
  "expiry_date": "datetime?",
  "is_active": true
}
```

**Indexes**: `(tenant_id, sku)` unique, `(tenant_id, barcode)`, text on name/sku

## invoices

```json
{
  "tenant_id": "ObjectId",
  "invoice_number": "INV-000001",
  "items": [{ "product_id", "name", "sku", "quantity", "unit_price", "tax_rate", "line_total" }],
  "subtotal", "tax_total", "discount_total", "grand_total",
  "amount_paid", "amount_due", "status": "paid|partial|pending",
  "payments": [{ "method": "cash|card|upi", "amount" }],
  "customer_id": "ObjectId?",
  "created_by": "ObjectId",
  "created_at": "datetime"
}
```

## customers, categories, stock_movements, expenses, notifications, audit_logs

Follow same `tenant_id` pattern. See service implementations for field details.

## Relationships

```
shops 1───* users
shops 1───* products
shops 1───* invoices
shops 1───* customers
products *───1 categories
invoices *───1 customers (optional)
stock_movements *───1 products
```
