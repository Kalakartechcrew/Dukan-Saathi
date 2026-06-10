# Analytics & Event Tracking Setup

This document outlines the analytics infrastructure and event tracking implementation for Dukan Saathi.

## Infrastructure

The analytics layer is centralized to support multiple tracking providers (GTM, GA4) with a standardized event format.

### Files Created/Modified

- `frontend/src/lib/gtm.ts`: GTM initialization and script injection logic.
- `frontend/src/lib/analytics.ts`: Unified analytics wrapper. Standardizes event payloads.
- `frontend/src/utils/analytics.ts`: Reusable API for tracking across the app.
- `frontend/src/hooks/useTracking.ts`: React Router hook for automatic page view tracking and UTM capture.
- `frontend/src/App.tsx`: Initializes the tracker on app startup.

## Setup Instructions

### 1. Google Tag Manager (GTM)
- Create a GTM container.
- Copy the GTM ID (e.g., `GTM-XXXXXXX`).
- Add it to your `.env` file as `VITE_GTM_ID`.

### 2. Google Analytics 4 (GA4)
- Create a GA4 property.
- Copy the Measurement ID (e.g., `G-XXXXXXXXXX`).
- Add it to your `.env` file as `VITE_GA4_ID`.

## Standardized Event Format

All events pushed to `window.dataLayer` follow this format:

```json
{
  "event": "event_name",
  "timestamp": 1623312000000,
  "source": "dukansaathi",
  "param1": "value1",
  "param2": "value2"
}
```

## Tracked Events

| Event Name | Description | Parameters | Location |
|------------|-------------|------------|----------|
| `page_view` | Fired on every route change | `page_path`, `page_title`, `page_location` | `useTracking.ts` |
| `sign_up` | User successfully signs up | `method` | `SignUpPage.tsx` |
| `login` | User successfully logs in | `method` | `LoginPage.tsx` |
| `logout` | User logs out | - | `authStore.ts` |
| `start_trial` | User starts a free trial | - | `OnboardingPage.tsx` |
| `purchase` | Subscription plan purchased | `amount`, `currency`, `plan_name`, `transaction_id` | `SubscribePage.tsx` |
| `generate_lead` | Enterprise contact requested | `type` | `PricingPage.tsx` |
| `view_pricing` | Pricing page viewed | - | `PricingPage.tsx` |
| `view_features` | Features page viewed | - | `FeaturesPage.tsx` |
| `inventory_created` | New product added | `name`, `price`, `method` | `InventoryPage.tsx` |
| `inventory_updated` | Product details updated | `name` | `InventoryPage.tsx` |
| `bill_generated` | POS sale completed | `invoice_id`, `amount`, `items_count`, `payment_method` | `POSPage.tsx` |
| `customer_created` | New customer added | `name`, `phone` | `CustomersPage.tsx` |
| `whatsapp_click` | WhatsApp sharing action | `type`, `invoice_id`, `payment_id` | `POSPage.tsx`, `InvoicesPage.tsx`, `CustomersPage.tsx` |
| `report_generated` | Printable report opened | `month` | `ReportsPage.tsx` |

## Testing Guide

1. **Development Mode**:
   - Analytics events are logged to the console in development mode.
   - Open browser DevTools and look for `[Analytics] event_name` groups.
   
2. **GTM Preview Mode**:
   - Use GTM Preview mode to verify events are reaching the container.
   
3. **GA4 DebugView**:
   - Use GA4 DebugView to verify real-time event processing.

4. **Production**:
   - Console logs are disabled in production to maintain performance and privacy.
