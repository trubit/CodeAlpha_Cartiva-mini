# Cartiva Mini — Official Paystack Integration Guide (Phase 13)

## 1. Official Documentation Reference

- **Paystack Developer Documentation**: [https://paystack.com/docs/](https://paystack.com/docs/)
- **API Reference**: Standard REST API at `https://api.paystack.co`
- **Supported Payment Channels**:
  - Cards (Visa, Mastercard, Verve)
  - Bank Account & Direct Debit
  - Bank Transfer & USSD (e.g. *737#)
  - Mobile Money (e.g., MTN MoMo, Vodafone Cash in supported regions)
  - Visa QR

---

## 2. Environment Variables & Secret Protection

All Paystack credentials remain strictly server-side in the backend environment:

| Variable | Environment | Security Boundary | Purpose |
| :--- | :--- | :--- | :--- |
| `PAYSTACK_SECRET_KEY` | Backend | **SENSITIVE — Never exposed** | Authorizes API requests and validates webhook signatures |
| `PAYSTACK_PUBLIC_KEY` | Backend / Frontend | Public (prefixed for client) | Used to initialize client checkout components |
| `PAYSTACK_WEBHOOK_SECRET` | Backend | **SENSITIVE — Never exposed** | Optional secret override for webhook signature HMAC |
| `PAYSTACK_BASE_URL` | Backend | Standard URL | API endpoint URL (default: `https://api.paystack.co`) |

> [!CAUTION]
> Never place `PAYSTACK_SECRET_KEY` in frontend source code, public API payloads, or client bundles.

---

## 3. Merchant Business Account Configuration Prerequisite

> [!IMPORTANT]
> **Pre-Approval Requirement**:
> Before approving Phase 13 for live processing, ensure that the Paystack Business Account is actively configured for the currencies and channels Cartiva Mini intends to process.
> - By default, Paystack accounts in Nigeria process **NGN**.
> - Multi-currency processing (**USD, GHS, ZAR, KES**) requires submitting merchant compliance documentation and enabling multi-currency settlement within the Paystack Merchant Dashboard.
> - Currencies requested that are not enabled in the merchant dashboard will be rejected by the Paystack API with a `400 Bad Request`. Cartiva Mini proactively verifies currency support prior to calling Paystack.

---

## 4. Integer Minor Units & Zero-Floating-Point Currency Integrity

Paystack expects all transaction amounts in the official minor currency unit (integers):
- **NGN**: 1 Naira = 100 Kobo (e.g., ₦227.38 -> `22738` Kobo).
- **USD**: 1 Dollar = 100 Cents (e.g., $359.00 -> `35900` Cents).
- **Cartiva Mini Guarantee**: Calculations are performed in exact integer minor units (`amountMinor`). Floating-point division by 100 occurs solely at formatted presentation boundaries.

---

## 5. Endpoints Used

| Action | HTTP Method | Paystack Endpoint | Cartiva Mini Calling Service |
| :--- | :--- | :--- | :--- |
| Initialize Payment | `POST` | `/transaction/initialize` | `PaystackProvider.initializePayment` |
| Verify Payment | `GET` | `/transaction/verify/:reference` | `PaystackProvider.verifyPayment` |
| Issue Refund | `POST` | `/refund` | `PaystackProvider.processRefund` |
| Fetch Transaction | `GET` | `/transaction/verify/:reference` | `PaystackProvider.fetchTransaction` |
