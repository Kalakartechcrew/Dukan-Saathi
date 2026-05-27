# SaaS Admin, Subscription, and Notification Architecture

## System Architecture

Sathi now has two operating surfaces:

- Shopkeeper app: inventory, POS, billing, customers, reports, expenses, settings.
- Platform admin app: tenant monitoring, plans, subscriptions, payments, notifications, activity, automations.

Every shop is a tenant. Tenant-owned data keeps `tenant_id` on documents. Platform-owned data such as `subscription_plans` is global. Subscription state is stored in `subscriptions`, while denormalized fields on `shops` make admin tables fast: `subscription_plan`, `subscription_status`, and `subscription_expires_at`.

## Database Design

Core collections:

- `users`: owner, staff, admin users; `tenant_id`, `role`, `is_active`, `last_login_at`, `last_active_at`, `refresh_tokens`, `force_logout_at`.
- `shops`: tenant workspace, branding, tax, invoice settings, subscription summary, status flags.
- `subscription_plans`: dynamic admin-controlled plans with `features` and `limits`.
- `subscriptions`: tenant plan lifecycle with status, start, expiry, renewal, grace, auto-renew, history.
- `subscription_payments`: checkout/payment verification records and manual admin payments.
- `notifications`: tenant notifications with read/unread state and admin broadcast support.
- `activity_logs`: API action log with user, tenant, module, method/action, path, status.
- `login_history`: login tracking for security and usage analytics.
- `audit_logs`: admin/security decisions such as suspend, activate, delete.

Important indexes:

- `users.email` unique.
- `users(tenant_id, role)`.
- `subscription_plans.code` unique.
- `subscriptions(tenant_id, status, expires_at)`.
- `subscriptions(expires_at, status)`.
- `subscription_payments(tenant_id, created_at)`.
- `activity_logs(tenant_id, created_at)`.
- `notifications(tenant_id, user_id, read)`.

## Role And Permission System

Roles:

- `super_admin`: full platform control.
- `admin`: platform admin access.
- `owner`: full tenant control.
- `manager`: operational tenant control.
- `cashier`: billing and customers.
- `staff`: inventory/product operations.

API protection is layered:

1. JWT authentication validates user identity.
2. Account status blocks suspended users.
3. Force logout compares token `iat` against `force_logout_at`.
4. Permission dependency checks module permission.
5. Subscription dependency blocks expired tenants.
6. Plan limit checks block product/invoice overuse.

## Subscription Lifecycle

Signup:

1. Create shop tenant.
2. Create owner user.
3. Create default trial subscription.
4. Store subscription summary on shop.
5. Send welcome notification.

Plan activation:

1. Admin creates or edits a plan.
2. Tenant starts checkout or admin records payment.
3. Payment is stored in `subscription_payments`.
4. Verification prevents duplicate activation for already-paid checkout.
5. Current active/trial subscriptions are marked `replaced`.
6. New subscription is inserted with start, expiry, renewal, grace, status.
7. Shop summary fields are updated.

Expiry:

1. Subscription remains usable until `expires_at` or `grace_until`.
2. After grace ends, automation marks subscription `expired`.
3. `get_tenant_id` blocks tenant APIs with HTTP `402`.

Plan limits:

- Product create checks `limits.products`.
- Invoice create checks `limits.monthly_invoices`.
- Staff/account limits can be applied when staff user creation is added.
- Report endpoints check plan feature access.

## Notification Flow

Admin broadcast:

1. Admin selects all tenants or plan-based tenants.
2. Backend inserts notification documents per tenant.
3. Header notification bell polls `/notifications`.
4. User sees unread count and latest notifications.
5. Clicking a notification marks it read.

Automation notifications:

- 7 days before expiry.
- 3 days before expiry.
- 1 day before expiry.
- On expiry day.

## Payment Lifecycle

Manual payment is implemented for admin operations:

1. Admin selects tenant and plan.
2. Admin records paid amount.
3. Payment is stored.
4. Subscription activates immediately.

Provider checkout skeleton is implemented:

- `POST /subscriptions/checkout`
- `POST /subscriptions/verify-payment`

Production payment gateway integration should add:

- Razorpay/Stripe order creation.
- Webhook signature verification.
- Idempotency key per provider payment id.
- Payment retry status.
- GST invoice generation for subscription payment.

## API Structure

Admin:

- `GET /admin/analytics`
- `GET /admin/tenants`
- `PATCH /admin/tenants/{tenant_id}/status`
- `DELETE /admin/tenants/{tenant_id}`
- `POST /admin/users/{user_id}/force-logout`
- `POST /admin/users/{user_id}/reset-password`
- `GET/POST/PATCH/DELETE /admin/plans`
- `POST /admin/subscriptions/assign`
- `GET/POST /admin/payments`
- `POST /admin/notifications/broadcast`
- `GET /admin/activity`
- `GET /admin/login-history`
- `POST /admin/automations/subscription-reminders/run`

Tenant subscription:

- `GET /subscriptions/plans`
- `GET /subscriptions/me`
- `POST /subscriptions/checkout`
- `POST /subscriptions/verify-payment`
- `POST /subscriptions/cancel`

Notifications:

- `GET /notifications`
- `POST /notifications/{id}/read`

## Automation And Cron

The automation service is safe to call from:

- Render/Railway cron.
- GitHub Actions schedule.
- Celery beat.
- APScheduler worker.
- Kubernetes CronJob.

Recommended production command:

```bash
curl -X POST https://api.example.com/api/v1/admin/automations/subscription-reminders/run \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
```

For larger scale, move automation to a worker process and queue notifications through Redis/Celery or RQ.

## Security Architecture

- JWT access and refresh tokens.
- Refresh token storage and revocation.
- Force logout via `force_logout_at`.
- Role and permission checks.
- Tenant isolation with `tenant_id`.
- Subscription middleware with HTTP `402`.
- Activity and audit logs.
- Rate limiting already configured through SlowAPI.
- Payment duplicate prevention through unique `provider_payment_id`.

Production hardening:

- Store JWT secret and payment secrets in a managed secret store.
- Use HTTPS only.
- Add webhook signature validation.
- Add admin IP allowlisting if required.
- Encrypt high-risk payment/customer fields if business policy requires it.
- Add log retention policy and export to centralized logging.

## Deployment Architecture

- Frontend: Vercel or static hosting behind CDN.
- Backend: Render/Railway/AWS/DigitalOcean app service.
- Database: MongoDB Atlas with automated backups.
- Cache/queue: Redis.
- Reverse proxy: Nginx.
- Worker: separate backend worker for automations and reminders.
- Monitoring: uptime checks, API logs, DB metrics, error tracking.

## Implementation Roadmap

Phase 1:

- Dynamic subscription plans.
- Trial creation on signup.
- Subscription enforcement.
- Product and invoice plan limits.
- Admin tenant and plan management.
- Notification broadcast.
- Activity logs.

Phase 2:

- Razorpay/Stripe checkout UI.
- Payment webhooks.
- Subscription GST invoices.
- Staff creation with limits.
- Admin login-history details with device/IP.

Phase 3:

- Background worker and queue.
- Scheduled notification editor.
- Real-time WebSocket notifications.
- Advanced revenue charts.
- Exportable admin reports.

Phase 4:

- Feature flags per tenant.
- Per-plan module switches.
- Enterprise custom plans.
- Admin support tools.
- Data retention controls.
