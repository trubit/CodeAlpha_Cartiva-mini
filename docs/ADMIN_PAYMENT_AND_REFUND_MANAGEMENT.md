# Cartiva Mini — Admin Payment & Refund Management

## 1. Overview
The payment management system provides transparency into customer transactions, payment gateway verification, currency separation, and administrative refunds through the Paystack integration built in Phase 13.

## 2. Payment Verification & Auditing
- **Zero Hardcoded Figures:** Every financial value is derived directly from verified database records.
- **Currency Isolation:** Transactions are processed in Nigerian Naira (`NGN`). The system strictly avoids mixing currencies without official exchange rate conversion.
- **Minor Units Integrity:** Calculations use integer minor units (100 kobo = ₦1.00) to ensure zero rounding errors.
- **Paystack Webhook & Polling Ledger:** Both asynchronous webhooks (verified via `x-paystack-signature` HMAC-SHA512) and manual verification lookups update the atomic transaction status.
- **Endpoints:**
  - `GET /api/v1/admin/payments`: Paginated transaction list with status, amount, and reference filtering.
  - `GET /api/v1/admin/payments/:reference`: Full audit ledger, gateway metadata, and customer details.

## 3. Administrative Refund Processing
- **Eligibility Verification:** Refunds can only be issued against payments with `status = 'paid'`.
- **Duplicate & Excess Prevention:** Partial and full refunds are tracked against the payment. Total refunded minor units cannot exceed `amountMinor`.
- **Reason & Operator Audit:** Refunds require an operational reason and record the authorizing administrator's user ID.
- **Paystack Direct Refund:** Interfaced with Paystack's `/refund` API to initiate funds return to the customer's funding card or bank account.
- **Endpoints:**
  - `POST /api/v1/admin/payments/:id/refunds`: Initiates an authorized refund via Paystack.
