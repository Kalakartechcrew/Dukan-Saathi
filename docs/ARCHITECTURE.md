# Sathi Platform Architecture

## Overview

**Sathi** is a multi-tenant SaaS platform for retail shopkeepers — combining inventory, POS billing, CRM, analytics, and platform administration in one stack.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Clients (Web / PWA)                       │
│              React + Vite + Tailwind + TanStack Query            │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST / WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                     FastAPI API Gateway                            │
│  Auth (JWT) │ RBAC │ Rate Limit │ Tenant Middleware │ Swagger      │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   MongoDB Atlas         Redis (cache)      Email / Payments
   (tenant-scoped)       sessions/queues    Razorpay / Stripe
```

## Multi-Tenant Model

| Strategy | Implementation |
|----------|----------------|
| Isolation | Shared database, `tenant_id` on every document |
| Identity | Shop `_id` = `tenant_id` on users & data |
| Query rule | All reads/writes filter `{ tenant_id: <from JWT> }` |
| Super admin | `role=super_admin`, cross-tenant read for `/admin/*` |

## Backend Layers

```
app/
├── core/          # config, db, security, permissions, tenant helpers
├── api/v1/        # REST routers (thin controllers)
├── services/      # business logic (billing, products, auth)
├── schemas/       # Pydantic request/response models
└── templates/     # Jinja2 invoice HTML
```

## Frontend Layers

```
src/
├── components/ui/     # Button, Card, Input, Skeleton
├── components/layout/ # Sidebar, Header, AppLayout
├── pages/             # feature screens
├── stores/            # Zustand (auth, theme)
└── lib/               # api client, utils
```

## Security

- **JWT**: Access (30m) + Refresh (7d) with rotation on refresh
- **RBAC**: Owner, Manager, Cashier, Staff, Super Admin
- **Rate limiting**: slowapi per IP
- **Input validation**: Pydantic on all endpoints
- **Passwords**: bcrypt via passlib

## Real-time

WebSocket `/api/v1/ws/{tenant_id}` broadcasts billing updates to connected POS clients.

## Deployment

| Component | Target |
|-----------|--------|
| Frontend | Vercel / Netlify |
| Backend | Render / Railway / AWS ECS |
| Database | MongoDB Atlas |
| Reverse proxy | Nginx (Docker Compose locally) |
