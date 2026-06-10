import html
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from bson import ObjectId

from app.api.deps import get_tenant_id, require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.core.tenant import tenant_filter
from app.models.base import serialize_doc, utc_now
from app.services.subscription_service import assert_feature_allowed

router = APIRouter(prefix="/reports", tags=["Reports"])


def _date_range(start: Optional[datetime], end: Optional[datetime]) -> dict:
    now = utc_now()
    return {"$gte": start or (now - timedelta(days=30)), "$lte": end or now}


def _month_bounds(month: Optional[str]) -> tuple[datetime, datetime, str]:
    now = utc_now()
    if month:
        start = datetime.strptime(month, "%Y-%m").replace(tzinfo=timezone.utc)
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end, start.strftime("%Y-%m")


def _money(value: float | int | None) -> str:
    return f"Rs. {float(value or 0):,.2f}"


def _pct(value: float | int | None) -> str:
    return f"{float(value or 0):.2f}%"


def _safe(value: object) -> str:
    return html.escape(str(value or ""))


def _bar_width(value: float, maximum: float) -> int:
    if maximum <= 0:
        return 0
    return max(4, min(100, round((value / maximum) * 100)))


async def _monthly_business_report(tenant_id: str, month: Optional[str]) -> dict:
    db = get_db()
    start, end, label = _month_bounds(month)
    date_filter = {"$gte": start, "$lt": end}

    sales = await db.invoices.aggregate([
        {"$match": tenant_filter(tenant_id, {"created_at": date_filter})},
        {"$group": {
            "_id": None,
            "orders": {"$sum": 1},
            "revenue": {"$sum": "$grand_total"},
            "collected": {"$sum": "$amount_paid"},
            "pending": {"$sum": "$amount_due"},
            "tax": {"$sum": "$tax_total"},
            "discount": {"$sum": "$discount_total"},
        }},
    ]).to_list(1)
    sales_summary = sales[0] if sales else {"orders": 0, "revenue": 0, "collected": 0, "pending": 0, "tax": 0, "discount": 0}

    cogs = await db.invoices.aggregate([
        {"$match": tenant_filter(tenant_id, {"created_at": date_filter})},
        {"$unwind": "$items"},
        {"$group": {"_id": None, "cost": {"$sum": {"$multiply": ["$items.quantity", {"$ifNull": ["$items.buying_price", 0]}]}}}},
    ]).to_list(1)
    cost_of_goods = cogs[0]["cost"] if cogs else 0

    expenses_by_category = await db.expenses.aggregate([
        {"$match": tenant_filter(tenant_id, {"expense_date": date_filter})},
        {"$group": {"_id": "$category", "amount": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"amount": -1}},
    ]).to_list(None)
    daily_expenses = await db.expenses.aggregate([
        {"$match": tenant_filter(tenant_id, {"expense_date": date_filter})},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$expense_date"}}, "amount": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]).to_list(None)
    top_expenses = await db.expenses.find(tenant_filter(tenant_id, {"expense_date": date_filter})).sort("amount", -1).limit(10).to_list(10)
    total_expenses = sum(item["amount"] for item in expenses_by_category)

    gross_profit = sales_summary["revenue"] - cost_of_goods
    net_profit = gross_profit - total_expenses
    margin = (net_profit / sales_summary["revenue"] * 100) if sales_summary["revenue"] else 0
    expense_ratio = (total_expenses / sales_summary["revenue"] * 100) if sales_summary["revenue"] else 0

    inventory = await db.products.aggregate([
        {"$match": tenant_filter(tenant_id, {"is_active": True})},
        {"$group": {
            "_id": None,
            "items": {"$sum": 1},
            "units": {"$sum": "$quantity"},
            "buying_value": {"$sum": {"$multiply": ["$quantity", "$buying_price"]}},
            "selling_value": {"$sum": {"$multiply": ["$quantity", "$selling_price"]}},
        }},
    ]).to_list(1)
    low_stock_count = await db.products.count_documents(tenant_filter(tenant_id, {"is_active": True, "$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}}))

    recommendations = []
    if net_profit > 0:
        recommendations.append(f"This month is profitable by {net_profit:.2f}. Keep monitoring expense ratio and collections.")
    elif sales_summary["revenue"] > 0:
        recommendations.append(f"This month is in loss by {abs(net_profit):.2f}. Reduce high expense categories or improve selling margin.")
    else:
        recommendations.append("No sales recorded this month. Focus on billing consistency before judging profitability.")
    if expense_ratio > 35:
        recommendations.append("Expenses are high compared with revenue. Review rent, salary, transport, and miscellaneous spending.")
    if sales_summary["pending"] > 0:
        recommendations.append("Pending customer dues are affecting cash flow. Follow up with credit customers this week.")
    if low_stock_count:
        recommendations.append(f"{low_stock_count} products are low on stock. Reorder fast-moving items before sales are missed.")
    if sales_summary["discount"] > sales_summary["revenue"] * 0.08 and sales_summary["revenue"]:
        recommendations.append("Discounts are high. Check whether offers are improving sales enough to justify margin loss.")

    return {
        "month": label,
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "status": "profit" if net_profit >= 0 else "loss",
        "sales": sales_summary,
        "cost_of_goods": cost_of_goods,
        "gross_profit": gross_profit,
        "expenses": {"total": total_expenses, "by_category": [{"category": i["_id"], "amount": i["amount"], "count": i["count"]} for i in expenses_by_category], "daily": daily_expenses, "top": [serialize_doc(i) for i in top_expenses]},
        "net_profit": net_profit,
        "net_margin_percent": round(margin, 2),
        "expense_ratio_percent": round(expense_ratio, 2),
        "inventory": inventory[0] if inventory else {"items": 0, "units": 0, "buying_value": 0, "selling_value": 0},
        "low_stock_count": low_stock_count,
        "recommendations": recommendations,
    }


async def _render_monthly_report_html(tenant_id: str, month: Optional[str]) -> str:
    db = get_db()
    shop = await db.shops.find_one({"_id": ObjectId(tenant_id)})
    report = await _monthly_business_report(tenant_id, month)
    shop = serialize_doc(shop) if shop else {}
    categories = report["expenses"]["by_category"]
    daily = report["expenses"]["daily"]
    top = report["expenses"]["top"]
    max_category = max([item["amount"] for item in categories] or [0])
    max_daily = max([item["amount"] for item in daily] or [0])
    status_color = "#059669" if report["status"] == "profit" else "#dc2626"
    status_bg = "#ecfdf5" if report["status"] == "profit" else "#fef2f2"
    status_label = "PROFITABLE" if report["status"] == "profit" else "LOSS"
    logo = shop.get("branding", {}).get("logo_url")
    logo_html = f'<img src="{_safe(logo)}" alt="{_safe(shop.get("name"))}">' if logo else _safe((shop.get("name") or "S")[:1])

    category_rows = "\n".join(
        f"""
        <div class="bar-row">
          <div class="bar-label"><strong>{_safe(item['category']).title()}</strong><span>{item['count']} entries</span></div>
          <div class="bar-track"><div class="bar-fill expense" style="width:{_bar_width(item['amount'], max_category)}%"></div></div>
          <div class="bar-value">{_money(item['amount'])}</div>
        </div>
        """
        for item in categories
    ) or '<p class="muted">No expenses recorded for this month.</p>'

    daily_rows = "\n".join(
        f"""
        <div class="daily-bar">
          <div class="daily-column" style="height:{_bar_width(item['amount'], max_daily)}%"></div>
          <span>{_safe(str(item['_id'])[-2:])}</span>
        </div>
        """
        for item in daily
    ) or '<p class="muted">No daily expense trend available.</p>'

    top_rows = "\n".join(
        f"""
        <tr>
          <td>{_safe(item.get('expense_date', '')[:10])}</td>
          <td><strong>{_safe(item.get('title'))}</strong><br><span>{_safe(item.get('notes'))}</span></td>
          <td>{_safe(item.get('category')).title()}</td>
          <td class="num">{_money(item.get('amount'))}</td>
        </tr>
        """
        for item in top
    ) or '<tr><td colspan="4" class="center muted">No expense entries.</td></tr>'

    recommendations = "\n".join(f"<li>{_safe(item)}</li>" for item in report["recommendations"])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':
  new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  }})(window,document,'script','dataLayer','GTM-WRDLCKKL');</script>
  <!-- End Google Tag Manager -->
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-KBZPKCNC60"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-KBZPKCNC60');
  </script>
  <title>Monthly Business Report - {_safe(report['month'])}</title>
  <style>
    :root {{ --brand:#4f46e5; --accent:#14b8a6; --ink:#111827; --muted:#64748b; --line:#e5e7eb; --paper:#ffffff; }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; background:#eef2f7; color:var(--ink); font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
    .actions {{ position:sticky; top:0; z-index:10; display:flex; justify-content:flex-end; gap:8px; padding:10px 18px; background:#0f172a; }}
    button {{ border:0; border-radius:10px; padding:9px 14px; background:var(--brand); color:white; font-weight:800; cursor:pointer; }}
    .report {{ width:210mm; min-height:297mm; margin:0 auto; background:var(--paper); padding:22mm 18mm; }}
    .top {{ height:9px; margin:-22mm -18mm 18px; background:linear-gradient(90deg,var(--brand),var(--accent)); }}
    .header {{ display:flex; justify-content:space-between; gap:28px; border-bottom:1px solid var(--line); padding-bottom:18px; }}
    .brand {{ display:flex; gap:14px; align-items:flex-start; }}
    .logo {{ width:58px; height:58px; display:grid; place-items:center; overflow:hidden; border-radius:16px; background:var(--brand); color:white; font-size:26px; font-weight:900; }}
    .logo img {{ width:100%; height:100%; object-fit:cover; }}
    h1,h2,h3,p {{ margin:0; }}
    h1 {{ font-size:28px; letter-spacing:-.02em; }}
    h2 {{ font-size:17px; margin-bottom:12px; }}
    .muted {{ color:var(--muted); font-size:12px; line-height:1.5; }}
    .title {{ text-align:right; }}
    .badge {{ display:inline-block; margin-top:8px; padding:7px 11px; border-radius:999px; color:{status_color}; background:{status_bg}; font-size:12px; font-weight:900; letter-spacing:.08em; }}
    .grid {{ display:grid; gap:14px; }}
    .cards {{ grid-template-columns:repeat(4,1fr); margin-top:22px; }}
    .card {{ border:1px solid var(--line); border-radius:16px; padding:14px; background:#fff; }}
    .card .label {{ color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.08em; }}
    .card .value {{ margin-top:7px; font-size:20px; font-weight:900; }}
    .hero {{ margin-top:18px; border-radius:20px; padding:20px; background:{status_bg}; border:1px solid {status_color}33; display:flex; justify-content:space-between; gap:24px; }}
    .hero strong {{ color:{status_color}; font-size:32px; }}
    .section {{ margin-top:22px; page-break-inside:avoid; }}
    .two {{ grid-template-columns:1fr 1fr; }}
    .bar-row {{ display:grid; grid-template-columns:150px 1fr 120px; gap:12px; align-items:center; margin:10px 0; }}
    .bar-label strong {{ display:block; font-size:13px; }}
    .bar-label span {{ color:var(--muted); font-size:11px; }}
    .bar-track {{ height:13px; border-radius:999px; background:#f1f5f9; overflow:hidden; }}
    .bar-fill {{ height:100%; border-radius:999px; background:linear-gradient(90deg,var(--brand),var(--accent)); }}
    .bar-fill.expense {{ background:linear-gradient(90deg,#f97316,#ef4444); }}
    .bar-value {{ font-weight:800; font-size:12px; text-align:right; }}
    .daily-chart {{ height:170px; display:flex; align-items:end; gap:6px; padding:14px 6px 0; border-bottom:1px solid var(--line); }}
    .daily-bar {{ flex:1; min-width:12px; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:end; gap:5px; }}
    .daily-column {{ width:100%; min-height:4px; border-radius:8px 8px 0 0; background:linear-gradient(180deg,#8b5cf6,#4f46e5); }}
    .daily-bar span {{ font-size:9px; color:var(--muted); }}
    table {{ width:100%; border-collapse:collapse; font-size:12px; }}
    th {{ text-align:left; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; font-size:10px; border-bottom:1px solid var(--line); padding:9px 8px; }}
    td {{ border-bottom:1px solid #f1f5f9; padding:10px 8px; vertical-align:top; }}
    td span {{ color:var(--muted); font-size:11px; }}
    .num {{ text-align:right; font-weight:800; }}
    .center {{ text-align:center; }}
    .recommendations {{ margin:0; padding-left:18px; }}
    .recommendations li {{ margin:8px 0; line-height:1.45; }}
    .footer {{ margin-top:28px; padding-top:14px; border-top:1px solid var(--line); display:flex; justify-content:space-between; gap:16px; }}
    @page {{ size:A4; margin:0; }}
    @media print {{ body {{ background:white; }} .actions {{ display:none; }} .report {{ width:auto; min-height:auto; margin:0; padding:16mm 14mm; }} .top {{ margin:-16mm -14mm 16px; }} }}
    @media (max-width: 800px) {{ .report {{ width:100%; padding:20px; }} .cards,.two {{ grid-template-columns:1fr; }} .header,.hero,.footer {{ flex-direction:column; text-align:left; }} .title {{ text-align:left; }} .bar-row {{ grid-template-columns:1fr; }} }}
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save PDF</button></div>
  <main class="report">
    <div class="top"></div>
    <section class="header">
      <div class="brand">
        <div class="logo">{logo_html}</div>
        <div>
          <h1>{_safe(shop.get('name') or 'Sathi Shop')}</h1>
          <p class="muted">{_safe(shop.get('address'))}<br>{_safe(shop.get('city'))} {_safe(shop.get('state'))}<br>{'Phone: ' + _safe(shop.get('phone')) if shop.get('phone') else ''}</p>
        </div>
      </div>
      <div class="title">
        <h1>Monthly Business Report</h1>
        <p class="muted">Month: {_safe(report['month'])}<br>Generated: {_safe(utc_now().strftime('%Y-%m-%d %H:%M'))}</p>
        <span class="badge">{status_label}</span>
      </div>
    </section>

    <section class="hero">
      <div>
        <p class="muted">Final business result</p>
        <strong>{_money(abs(report['net_profit']))}</strong>
        <p class="muted">{'Net profit' if report['status'] == 'profit' else 'Net loss'} after cost of goods and daily expenses.</p>
      </div>
      <div>
        <p class="muted">Net margin</p>
        <strong>{_pct(report['net_margin_percent'])}</strong>
        <p class="muted">Expense ratio: {_pct(report['expense_ratio_percent'])}</p>
      </div>
    </section>

    <section class="grid cards">
      <div class="card"><p class="label">Sales</p><p class="value">{_money(report['sales']['revenue'])}</p></div>
      <div class="card"><p class="label">Collected</p><p class="value">{_money(report['sales']['collected'])}</p></div>
      <div class="card"><p class="label">Pending Dues</p><p class="value">{_money(report['sales']['pending'])}</p></div>
      <div class="card"><p class="label">Expenses</p><p class="value">{_money(report['expenses']['total'])}</p></div>
      <div class="card"><p class="label">Orders</p><p class="value">{report['sales']['orders']}</p></div>
      <div class="card"><p class="label">Cost of Goods</p><p class="value">{_money(report['cost_of_goods'])}</p></div>
      <div class="card"><p class="label">Gross Profit</p><p class="value">{_money(report['gross_profit'])}</p></div>
      <div class="card"><p class="label">Stock Value</p><p class="value">{_money(report['inventory'].get('selling_value'))}</p></div>
    </section>

    <section class="section grid two">
      <div class="card">
        <h2>Expense Category Chart</h2>
        {category_rows}
      </div>
      <div class="card">
        <h2>Daily Expense Trend</h2>
        <div class="daily-chart">{daily_rows}</div>
      </div>
    </section>

    <section class="section grid two">
      <div class="card">
        <h2>CA-style Recommendations</h2>
        <ul class="recommendations">{recommendations}</ul>
      </div>
      <div class="card">
        <h2>Inventory & Cash Flow</h2>
        <div class="bar-row"><div class="bar-label"><strong>Stock units</strong><span>{report['inventory'].get('items', 0)} products</span></div><div class="bar-track"><div class="bar-fill" style="width:70%"></div></div><div class="bar-value">{report['inventory'].get('units', 0)}</div></div>
        <div class="bar-row"><div class="bar-label"><strong>Low stock</strong><span>Needs reorder</span></div><div class="bar-track"><div class="bar-fill expense" style="width:{min(100, report['low_stock_count'] * 8)}%"></div></div><div class="bar-value">{report['low_stock_count']}</div></div>
        <div class="bar-row"><div class="bar-label"><strong>Pending dues</strong><span>Customer credit</span></div><div class="bar-track"><div class="bar-fill expense" style="width:{_bar_width(report['sales']['pending'], max(report['sales']['revenue'], 1))}%"></div></div><div class="bar-value">{_money(report['sales']['pending'])}</div></div>
      </div>
    </section>

    <section class="section card">
      <h2>Top Expense Entries</h2>
      <table>
        <thead><tr><th>Date</th><th>Remark</th><th>Category</th><th class="num">Amount</th></tr></thead>
        <tbody>{top_rows}</tbody>
      </table>
    </section>

    <section class="footer muted">
      <span>Sathi business report for shopkeeper decision-making.</span>
      <span>Reviewed by: ____________________</span>
    </section>
  </main>
</body>
</html>"""


@router.get("/sales")
async def sales_report(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.REPORTS_VIEW))],
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
):
    db = get_db()
    match = tenant_filter(tenant_id, {"created_at": _date_range(start, end)})
    totals = await db.invoices.aggregate([
        {"$match": match},
        {"$group": {
            "_id": "$status",
            "invoice_count": {"$sum": 1},
            "revenue": {"$sum": "$grand_total"},
            "tax": {"$sum": "$tax_total"},
            "discount": {"$sum": "$discount_total"},
            "paid": {"$sum": "$amount_paid"},
            "due": {"$sum": "$amount_due"},
        }},
    ]).to_list(None)
    trend = await db.invoices.aggregate([
        {"$match": match},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "revenue": {"$sum": "$grand_total"},
            "orders": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]).to_list(None)
    return {"totals_by_status": totals, "daily_trend": trend}


@router.get("/inventory")
async def inventory_report(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.REPORTS_VIEW))],
):
    db = get_db()
    valuation = await db.products.aggregate([
        {"$match": tenant_filter(tenant_id, {"is_active": True})},
        {"$group": {
            "_id": None,
            "items": {"$sum": 1},
            "units": {"$sum": "$quantity"},
            "buying_value": {"$sum": {"$multiply": ["$quantity", "$buying_price"]}},
            "selling_value": {"$sum": {"$multiply": ["$quantity", "$selling_price"]}},
        }},
    ]).to_list(1)
    low_stock = await db.products.find(
        tenant_filter(tenant_id, {"is_active": True, "$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}})
    ).sort("quantity", 1).limit(20).to_list(20)
    return {
        "valuation": valuation[0] if valuation else {"items": 0, "units": 0, "buying_value": 0, "selling_value": 0},
        "low_stock": [serialize_doc(item) for item in low_stock],
    }


@router.get("/profit-loss")
async def profit_loss_report(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.REPORTS_VIEW))],
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
):
    db = get_db()
    date_filter = _date_range(start, end)
    sales = await db.invoices.aggregate([
        {"$match": tenant_filter(tenant_id, {"created_at": date_filter})},
        {"$unwind": "$items"},
        {"$group": {
            "_id": None,
            "revenue": {"$sum": "$items.line_total"},
            "estimated_cost": {"$sum": {"$multiply": ["$items.quantity", {"$ifNull": ["$items.buying_price", 0]}]}},
        }},
    ]).to_list(1)
    expenses = await db.expenses.aggregate([
        {"$match": tenant_filter(tenant_id, {"expense_date": date_filter})},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    revenue = sales[0]["revenue"] if sales else 0
    cost = sales[0]["estimated_cost"] if sales else 0
    expense_total = expenses[0]["total"] if expenses else 0
    return {"revenue": revenue, "cost_of_goods": cost, "expenses": expense_total, "gross_profit": revenue - cost, "net_profit": revenue - cost - expense_total}


@router.get("/exports/{report_type}.csv")
async def export_report_csv(
    report_type: str,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.REPORTS_EXPORT))],
):
    return {"message": f"{report_type} CSV export job queued", "tenant_id": tenant_id}


@router.get("/monthly-business")
async def monthly_business_report(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.REPORTS_VIEW))],
    month: Optional[str] = Query(None, description="YYYY-MM"),
):
    await assert_feature_allowed(tenant_id, "reports")
    return await _monthly_business_report(tenant_id, month)


@router.get("/monthly-business.html", response_class=HTMLResponse)
async def monthly_business_report_html(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    _: Annotated[dict, Depends(require_permission(Permission.REPORTS_VIEW))],
    month: Optional[str] = Query(None, description="YYYY-MM"),
):
    await assert_feature_allowed(tenant_id, "reports")
    return HTMLResponse(await _render_monthly_report_html(tenant_id, month))
