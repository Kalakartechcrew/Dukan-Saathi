# Sathi Execution Roadmap

## Phase 1 — Foundation ✅ (Current)

- [x] Project structure (frontend + backend + Docker)
- [x] JWT auth (signup, login, refresh, RBAC)
- [x] Multi-tenant shop creation on signup
- [x] Product CRUD + inventory listing
- [x] POS billing + stock deduction
- [x] Dashboard analytics API
- [x] Customer CRM basics
- [x] Invoice HTML template
- [x] Premium React UI (dashboard, POS, inventory)

## Phase 2 — Core Business (Weeks 2–4)

- [ ] Categories tree + product variants UI
- [ ] Barcode/QR generation & scanner integration
- [ ] Purchase orders and vendor payment workflows if required later
- [ ] Expense tracking
- [ ] Refunds & returns workflow
- [ ] PDF invoice export (WeasyPrint)
- [ ] CSV/Excel bulk import/export
- [ ] Email OTP verification + password reset

## Phase 3 — Growth (Weeks 5–8)

- [ ] Subscription billing (Razorpay/Stripe)
- [ ] SaaS plans & feature gates
- [ ] Reports module (GST, P&L, inventory valuation)
- [ ] Scheduled reports + PDF/Excel export
- [ ] Notifications (email, browser push)
- [ ] WhatsApp receipt integration
- [ ] Multi-language (i18n)
- [ ] PWA + offline queue for POS

## Phase 4 — Intelligence (Weeks 9–12)

- [ ] Demand prediction ML pipeline
- [ ] Smart reorder suggestions
- [ ] Sales forecasting charts
- [ ] AI business insights dashboard
- [ ] Product recommendations

## Phase 5 — Enterprise (Months 4–6)

- [ ] Multi-warehouse
- [ ] API keys for integrations
- [ ] Audit logs UI
- [ ] Thermal printer drivers
- [ ] Custom invoice template editor
- [ ] White-label branding
- [ ] SOC2-ready security hardening
- [ ] Horizontal scaling (K8s, read replicas)

## Quick Start (Dev)

```bash
# Terminal 1 — MongoDB
docker compose up mongodb -d

# Terminal 2 — Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --app-dir .

# Terminal 3 — Frontend
cd frontend && npm run dev
```

Open http://localhost:5173 → Sign up → Onboarding → Add products → POS sale.
