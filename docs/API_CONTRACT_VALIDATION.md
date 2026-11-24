# API Contract Validation — Cartiva Mini

**Project:** Cartiva Mini  
**Phase:** 18 (API Validation & Verification)  
**Status:** Validated  

---

## 1. Overview

Every client-side HTTP request executed by the frontend services in `frontend/src/services/` was audited against its corresponding Express controller and Zod schema in `backend/src/`. All endpoint paths, HTTP verbs, payload contracts, and error responses conform to standardized API contracts.

---

## 2. API Contract Specification Table

| Domain / Resource | HTTP Verb | Endpoint Path | Auth Requirement | Payload Contract | Response Envelope |
|---|---|---|---|---|---|
| **Auth** | POST | `/api/v1/auth/register` | Public | `{ name, email, phone, password }` | `{ success: true, data: SafeUser }` |
| **Auth** | POST | `/api/v1/auth/verify-otp` | Public | `{ email, code, purpose }` | `{ success: true, data: { userId } }` |
| **Auth** | POST | `/api/v1/auth/resend-otp` | Public | `{ email, purpose }` | `{ success: true, data: { cooldownSeconds } }` |
| **Auth** | POST | `/api/v1/auth/login` | Public | `{ emailOrPhone, password }` | `{ success: true, data: { user, accessToken } }` |
| **Auth** | POST | `/api/v1/auth/refresh` | Cookie (`refreshToken`) | Empty body | `{ success: true, data: { user, accessToken } }` |
| **Auth** | POST | `/api/v1/auth/logout` | Bearer Token | Empty body | `{ success: true, data: null }` |
| **Products** | GET | `/api/v1/products` | Public | Query: `page, limit, category, sort` | `{ success: true, data: ProductListItemDto[], pagination }` |
| **Products** | GET | `/api/v1/products/:slug` | Public | Path param: `slug` | `{ success: true, data: ProductDetailDto }` |
| **Cart** | GET | `/api/v1/cart` | Optional Auth / Session | Header: `x-session-id` | `{ success: true, data: CartDto }` |
| **Cart** | POST | `/api/v1/cart/items` | Optional Auth / Session | `{ productId, variantId, quantity }` | `{ success: true, data: CartDto }` |
| **Shipping** | GET | `/api/v1/shipping/methods` | Public | Query: `country, state` | `{ success: true, data: ShippingMethodDto[] }` |
| **Checkout** | POST | `/api/v1/checkout/session` | Customer | Empty body | `{ success: true, data: CheckoutSessionDto }` |
| **Checkout** | POST | `/api/v1/checkout/confirm` | Customer | `{ acceptTerms, customerNotes }` | `{ success: true, data: { orderNumber } }` |
| **Payments** | POST | `/api/v1/payments/initialize` | Customer | `{ orderNumber, callbackUrl }` | `{ success: true, data: { authorizationUrl, reference } }` |
| **Payments** | GET | `/api/v1/payments/verify/:ref`| Customer / Staff | Path param: `reference` | `{ success: true, data: PaymentVerificationDto }` |
| **Notifications** | GET | `/api/v1/notifications` | Customer / Staff | Query: `page, limit, unreadOnly` | `{ success: true, data: { items, total, unreadCount } }` |
| **Notifications** | PATCH | `/api/v1/notifications/:id/read` | Customer / Staff | Path param: `id` | `{ success: true, data: { id, isRead } }` |
| **Admin Analytics** | GET | `/api/v1/admin/dashboard/stats` | Staff / Admin | Query: `timeframe` | `{ success: true, data: DashboardMetricsDto }` |

---

## 3. Error Contract Normalization

All endpoints return a standardized, non-leaking error envelope when handling invalid requests or runtime failures:

```json
{
  "success": false,
  "errorCode": "RESOURCE_NOT_FOUND",
  "message": "The requested resource was not found.",
  "statusCode": 404,
  "requestId": "c0f25b9a-2d2d-4a4c-a598-b672960d8628"
}
```
Client code normalizes all errors through `extractErrorMessage(error)` in `api.ts`, preventing unhandled exceptions or cryptic errors from bubbling to the UI.

