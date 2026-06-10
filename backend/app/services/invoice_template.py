import base64
from datetime import datetime, timezone
from io import BytesIO
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import qrcode
from jinja2 import Template
from weasyprint import HTML

INVOICE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  {% if public_view %}
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-KBZPKCNC60"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-KBZPKCNC60');
  </script>
  {% endif %}
  <title>Invoice {{ invoice.invoice_number }}</title>
  <style>
    :root { --brand: {{ shop.branding.primary_color or '#4f46e5' }}; --ink: #111827; --muted: #64748b; --line: #e5e7eb; }
    * { box-sizing: border-box; }
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; color: var(--ink); background: #f8fafc; }
    .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; padding: 24px 28px; }
    .topbar { height: 8px; margin: -24px -28px 22px; background: linear-gradient(90deg, var(--brand), #14b8a6); }
    .header { display: grid; grid-template-columns: 1.4fr .8fr; gap: 24px; border-bottom: 1px solid var(--line); padding-bottom: 18px; }
    .brand { display: flex; gap: 14px; align-items: flex-start; }
    .logo { width: 54px; height: 54px; border-radius: 14px; background: var(--brand); color: white; display: grid; place-items: center; font-size: 22px; font-weight: 800; overflow: hidden; }
    .logo img { width: 100%; height: 100%; object-fit: cover; }
    .shop-name { font-size: 26px; line-height: 1.1; font-weight: 800; color: var(--brand); }
    .muted, .meta, .footer { color: var(--muted); font-size: 12px; line-height: 1.55; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { margin: 0; letter-spacing: 2px; font-size: 28px; }
    .pill { display: inline-block; margin-top: 8px; border-radius: 999px; background: #eef2ff; color: var(--brand); padding: 5px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
    .box { border: 1px solid var(--line); border-radius: 12px; padding: 14px; }
    .box h3 { margin: 0 0 8px; font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0 12px; font-size: 13px; }
    th { background: #f8fafc; color: #475569; padding: 11px 10px; text-align: left; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .sku { color: var(--muted); font-size: 11px; }
    .summary { display: grid; grid-template-columns: 1fr 280px; gap: 24px; margin-top: 18px; }
    .payment-card { display: grid; grid-template-columns: 104px minmax(0, 1fr); gap: 14px; align-items: start; margin-top: 12px; border: 1px solid var(--line); border-radius: 12px; padding: 12px; page-break-inside: avoid; break-inside: avoid; }
    .payment-card img { display: block; width: 104px; height: 104px; }
    .payment-copy { min-width: 0; }
    .payment-title { margin: 0; font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
    .payment-amount { margin-top: 4px; font-size: 16px; font-weight: 800; }
    .payment-note { margin-top: 6px; color: var(--muted); font-size: 11px; line-height: 1.45; }
    .totals { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
    .row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .row:last-child { border-bottom: 0; }
    .grand { background: var(--brand); color: white; font-size: 17px; font-weight: 800; }
    .signature { margin-top: 42px; text-align: right; color: var(--muted); font-size: 12px; }
    .signature-line { display: inline-block; width: 180px; border-top: 1px solid #94a3b8; padding-top: 8px; }
    .actions { position: sticky; top: 0; width: 210mm; margin: 0 auto; background: #0f172a; color: white; padding: 10px 16px; display: flex; justify-content: flex-end; gap: 8px; }
    button { border: 0; border-radius: 8px; padding: 8px 12px; background: var(--brand); color: white; font-weight: 700; cursor: pointer; }
    @page { size: A4; margin: 0; }
    @media print {
      body { background: white; }
      .actions { display: none; }
      .sheet { width: auto; min-height: auto; margin: 0; padding: 18px 22px; }
      .topbar { margin: -18px -22px 18px; }
    }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print invoice</button></div>
  <main class="sheet">
  <div class="topbar"></div>
  <div class="header">
    <div class="brand">
      <div class="logo">
        {% if shop.branding.logo_url %}<img src="{{ shop.branding.logo_url }}" alt="{{ shop.name }}">{% else %}{{ shop.name[:1] }}{% endif %}
      </div>
      <div>
        <div class="shop-name">{{ shop.name }}</div>
        <div class="muted">
          {% if shop.address %}{{ shop.address }}<br>{% endif %}
          {% if shop.city or shop.state or shop.country %}{{ shop.city or '' }}{% if shop.city and shop.state %}, {% endif %}{{ shop.state or '' }} {{ shop.country or '' }}<br>{% endif %}
          {% if shop.phone %}Phone: {{ shop.phone }}<br>{% endif %}
          {% if shop.tax.gst_number %}GSTIN: {{ shop.tax.gst_number }}{% endif %}
        </div>
      </div>
    </div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <div class="pill">{{ invoice.status }}</div>
      <div class="meta" style="margin-top:12px">
        <strong>#{{ invoice.invoice_number }}</strong><br>
        Date & Time: {{ bill_datetime }}<br>
        Payment: {{ invoice.payment_methods | join(', ') if invoice.payment_methods else 'N/A' }}
      </div>
    </div>
  </div>

  <section class="grid">
    <div class="box">
      <h3>Bill To</h3>
      <strong>{{ invoice.customer_name or 'Walk-in Customer' }}</strong><br>
      <span class="muted">{% if invoice.customer_phone %}Phone: {{ invoice.customer_phone }}{% else %}No customer phone added{% endif %}</span>
    </div>
    <div class="box">
      <h3>Payment Summary</h3>
      <div class="meta">
        Paid: {{ money(invoice.amount_paid) }}<br>
        Due: {{ money(invoice.amount_due) }}<br>
        {% if invoice.notes %}Notes: {{ invoice.notes }}{% endif %}
      </div>
    </div>
  </section>

  <table>
    <thead>
      <tr>
        <th style="width:40%">Item</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">Discount</th>
        <th class="num">Tax</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
    {% for item in invoice["items"] %}
      <tr>
        <td><strong>{{ item.name }}</strong><div class="sku">SKU: {{ item.sku }}</div></td>
        <td class="num">{{ qty(item.quantity) }}</td>
        <td class="num">{{ money(item.unit_price) }}</td>
        <td class="num">{{ money(item.discount or 0) }}</td>
        <td class="num">{{ money(item.line_tax or 0) }}</td>
        <td class="num"><strong>{{ money(item.line_total) }}</strong></td>
      </tr>
    {% endfor %}
    </tbody>
  </table>

  <section class="summary">
    <div>
      <div class="box">
        <h3>Terms & Notes</h3>
        <div class="footer">{{ shop.invoice.terms or 'Goods once sold can be returned only as per shop policy. Please keep this invoice for warranty, exchange, and tax records.' }}</div>
      </div>
      {% if upi_qr %}
      <div class="payment-card">
        <img src="{{ upi_qr }}" alt="UPI payment QR">
        <div class="payment-copy">
          <p class="payment-title">Scan to Pay</p>
          <div class="payment-amount">{{ money(upi_amount) }}</div>
          <div class="payment-note">For payments made away from the shop, share the payment screenshot with the shopkeeper for validation.</div>
        </div>
      </div>
      {% endif %}
    </div>
    <div class="totals">
      <div class="row"><span>Subtotal</span><strong>{{ money(invoice.subtotal) }}</strong></div>
      <div class="row"><span>Discount</span><strong>{{ money(invoice.discount_total) }}</strong></div>
      <div class="row"><span>Tax</span><strong>{{ money(invoice.tax_total) }}</strong></div>
      <div class="row grand"><span>Grand Total</span><span>{{ money(invoice.grand_total) }}</span></div>
      <div class="row"><span>Amount Paid</span><strong>{{ money(invoice.amount_paid) }}</strong></div>
      <div class="row"><span>Balance Due</span><strong>{{ money(invoice.amount_due) }}</strong></div>
    </div>
  </section>

  <div class="signature"><span class="signature-line">Authorized signature</span></div>
  <p class="footer" style="margin-top:28px;text-align:center">{{ shop.invoice.footer_note or 'Thank you for your business!' }}</p>
  </main>
</body>
</html>"""


def _money(value: float | int | None) -> str:
    return f"{float(value or 0):,.2f}"


def _qty(value: float | int | None) -> str:
    amount = float(value or 0)
    return str(int(amount)) if amount.is_integer() else f"{amount:g}"


def _format_datetime(value, timezone_name: str | None = None) -> str:
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    else:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    try:
        dt = dt.astimezone(ZoneInfo(timezone_name or "Asia/Kolkata"))
    except Exception:
        dt = dt.astimezone(ZoneInfo("Asia/Kolkata"))
    return dt.strftime("%d %b %Y, %I:%M %p")


def _upi_qr_data_uri(shop: dict, invoice: dict) -> tuple[str | None, float]:
    payment = shop.get("payment") or {}
    upi_id = (payment.get("upi_id") or "").strip()
    if not upi_id or not payment.get("show_upi_qr_on_invoice"):
        return None, 0
    amount = float(invoice.get("amount_due") or 0)
    if amount <= 0:
        return None, 0
    params = {
        "pa": upi_id,
        "pn": payment.get("upi_name") or shop.get("name") or "Shop",
        "am": f"{amount:.2f}",
        "cu": shop.get("currency") or "INR",
        "tn": f"Invoice {invoice.get('invoice_number') or ''}".strip(),
    }
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=2)
    qr.add_data(f"upi://pay?{urlencode(params)}")
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}", amount


def render_invoice_html(shop: dict, invoice: dict, public_view: bool = False) -> str:
    shop = {
        "branding": {},
        "tax": {},
        "invoice": {},
        "payment": {},
        **(shop or {}),
    }
    invoice = {
        "items": [],
        "payment_methods": [],
        **(invoice or {}),
    }
    upi_qr, upi_amount = _upi_qr_data_uri(shop, invoice)
    return Template(INVOICE_HTML).render(
        shop=shop,
        invoice=invoice,
        money=_money,
        qty=_qty,
        bill_datetime=_format_datetime(invoice.get("created_at"), shop.get("timezone")),
        upi_qr=upi_qr,
        upi_amount=upi_amount,
        public_view=public_view,
    )


def render_invoice_pdf(shop: dict, invoice: dict) -> bytes:
    html = render_invoice_html(shop, invoice)
    return HTML(string=html).write_pdf()


PAYMENT_RECEIPT_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  {% if public_view %}
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-KBZPKCNC60"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-KBZPKCNC60');
  </script>
  {% endif %}
  <title>Payment Receipt {{ payment.receipt_number }}</title>
  <style>
    :root { --brand: {{ shop.branding.primary_color or '#4f46e5' }}; --ink: #111827; --muted: #64748b; --line: #e5e7eb; }
    * { box-sizing: border-box; }
    body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; margin: 0; background: #f8fafc; color: var(--ink); }
    .receipt { width: 148mm; min-height: 210mm; margin: 0 auto; background: white; padding: 24px; }
    .bar { height: 8px; margin: -24px -24px 22px; background: linear-gradient(90deg, var(--brand), #14b8a6); }
    .head { display: flex; justify-content: space-between; gap: 20px; border-bottom: 1px solid var(--line); padding-bottom: 18px; }
    .brand { display: flex; gap: 12px; align-items: flex-start; }
    .logo { width: 48px; height: 48px; border-radius: 12px; background: var(--brand); color: white; display: grid; place-items: center; font-weight: 800; overflow: hidden; }
    .logo img { width: 100%; height: 100%; object-fit: cover; }
    h1, h2, p { margin: 0; }
    .shop { font-size: 22px; font-weight: 800; color: var(--brand); }
    .muted { color: var(--muted); font-size: 12px; line-height: 1.5; }
    .title { text-align: right; }
    .box { border: 1px solid var(--line); border-radius: 14px; padding: 16px; margin-top: 18px; }
    .row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .row:last-child { border-bottom: 0; }
    .amount { margin-top: 20px; border-radius: 16px; background: var(--brand); color: white; padding: 18px; display: flex; justify-content: space-between; font-size: 22px; font-weight: 800; }
    .actions { position: sticky; top: 0; width: 148mm; margin: 0 auto; background: #0f172a; padding: 10px 16px; display: flex; justify-content: flex-end; }
    button { border: 0; border-radius: 8px; padding: 8px 12px; background: var(--brand); color: white; font-weight: 700; cursor: pointer; }
    @page { size: A5; margin: 0; }
    @media print { body { background: white; } .actions { display: none; } .receipt { width: auto; min-height: auto; margin: 0; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print receipt</button></div>
  <main class="receipt">
    <div class="bar"></div>
    <section class="head">
      <div class="brand">
        <div class="logo">{% if shop.branding.logo_url %}<img src="{{ shop.branding.logo_url }}" alt="{{ shop.name }}">{% else %}{{ shop.name[:1] }}{% endif %}</div>
        <div>
          <div class="shop">{{ shop.name }}</div>
          <div class="muted">
            {% if shop.address %}{{ shop.address }}<br>{% endif %}
            {% if shop.phone %}Phone: {{ shop.phone }}<br>{% endif %}
            {% if shop.tax.gst_number %}GSTIN: {{ shop.tax.gst_number }}{% endif %}
          </div>
        </div>
      </div>
      <div class="title">
        <h2>PAYMENT RECEIPT</h2>
        <p class="muted">#{{ payment.receipt_number }}<br>{{ payment.created_at }}</p>
      </div>
    </section>
    <section class="box">
      <div class="row"><span>Received from</span><strong>{{ payment.customer_name }}</strong></div>
      <div class="row"><span>Mobile</span><strong>{{ payment.customer_phone or '-' }}</strong></div>
      <div class="row"><span>Payment method</span><strong>{{ payment.method }}</strong></div>
      <div class="row"><span>Remaining balance</span><strong>{{ money(payment.remaining_balance) }}</strong></div>
      {% if payment.notes %}<div class="row"><span>Notes</span><strong>{{ payment.notes }}</strong></div>{% endif %}
    </section>
    {% if payment.applied_invoices %}
    <section class="box">
      <strong>Adjusted invoices</strong>
      {% for invoice in payment.applied_invoices %}
      <div class="row"><span>{{ invoice.invoice_number }}</span><strong>{{ money(invoice.amount) }}</strong></div>
      {% endfor %}
    </section>
    {% endif %}
    <div class="amount"><span>Amount Received</span><span>{{ money(payment.amount) }}</span></div>
    <p class="muted" style="text-align:center;margin-top:28px">This receipt is for payment collected against customer outstanding balance.</p>
  </main>
</body>
</html>"""


def render_payment_receipt_html(shop: dict, payment: dict, public_view: bool = False) -> str:
    shop = {"branding": {}, "tax": {}, **(shop or {})}
    return Template(PAYMENT_RECEIPT_HTML).render(shop=shop, payment=payment or {}, money=_money, public_view=public_view)


def render_payment_receipt_pdf(shop: dict, payment: dict) -> bytes:
    html = render_payment_receipt_html(shop, payment)
    return HTML(string=html).write_pdf()
