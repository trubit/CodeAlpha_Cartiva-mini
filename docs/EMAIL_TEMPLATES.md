# Centralized Email Template Management — Cartiva Mini

## 1. Design System & Aesthetics

All Cartiva Mini transactional emails adhere to the brand design system established in the project guidelines:
- **Palette:** Deep Navy (`#0A192F`, `#0F172A`), Royal Blue (`#2563EB`, `#1E40AF`), Soft White/Gray neutral backgrounds (`#F8FAFC`, `#FFFFFF`), and Yellow/Amber accents (`#D97706`, `#F59E0B`).
- **Typography:** Modern clean sans-serif system stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`).
- **Layout:** Mobile-responsive 600px container, 16px padding, subtle border radius (12px), accessible contrast ratios (WCAG AA compliant).
- **Footer:** Cartiva Mini tagline (*"Everything You Need, Just a Click Away."*), customer support contact link, and automatic unsubscribe links for non-essential communications.

## 2. Security & Template Injection Protection

To eliminate cross-site scripting (XSS) and HTML template injection attacks, all dynamic variables are strictly escaped using `escapeHtml`:
```ts
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```
Untrusted user input (names, order items, addresses, ticket subjects) cannot inject executable script or render arbitrary HTML tags.

## 3. Registered Template Catalog

The template engine in `backend/src/modules/notifications/notification.templates.ts` includes 17 pre-registered event templates:

| Template ID | Event Type | Target | Description |
|---|---|---|---|
| `tpl_welcome` | `ACCOUNT_WELCOME` | Customer | Account registration welcome email with CTA |
| `tpl_email_verification` | `EMAIL_VERIFICATION` | Customer | Secure verification link and token expiry notice |
| `tpl_password_reset` | `PASSWORD_RESET` | Customer | Secure password reset link with 1-hour expiry notice |
| `tpl_password_changed` | `PASSWORD_CHANGED` | Customer | Security notice confirming recent password change |
| `tpl_security_alert` | `SECURITY_ALERT` | Customer | Account security alert for unrecognized login/settings change |
| `tpl_order_confirmed` | `ORDER_CONFIRMED` | Customer | Full order receipt with total, currency, and items table |
| `tpl_order_processing` | `ORDER_PROCESSING` | Customer | Notice that order is being picked and packed |
| `tpl_order_dispatched` | `ORDER_DISPATCHED` | Customer | Dispatch notice with tracking number and carrier |
| `tpl_delivery_update` | `DELIVERY_UPDATE` | Customer | Tracking update with current shipment milestone |
| `tpl_delivery_completed` | `DELIVERY_COMPLETED` | Customer | Delivery confirmation and review request |
| `tpl_order_cancelled` | `ORDER_CANCELLED` | Customer | Cancellation confirmation and refund instructions |
| `tpl_payment_success` | `PAYMENT_SUCCESS` | Customer | Verified payment receipt with Paystack transaction ref |
| `tpl_payment_failed` | `PAYMENT_FAILED` | Customer | Payment failure notice with retry link |
| `tpl_refund_update` | `REFUND_UPDATE` | Customer | Refund status notice with amount and provider ref |
| `tpl_support_response` | `SUPPORT_RESPONSE` | Customer | Support reply notice with ticket number and safe link |
| `tpl_low_stock` | `LOW_STOCK` | Admin | Critical inventory warning for products at or below threshold |
| `tpl_promotion` | `PROMOTION` | Customer | Branded marketing update with opt-out / unsubscribe link |

## 4. Administrative Template Inspection

Authorized administrators can inspect registered templates and required variable schemas via:
- `GET /api/v1/admin/notifications/templates`
- `GET /api/v1/admin/notifications/templates/:id`
- Frontend UI: `/admin/notifications` -> Template Catalog tab.
