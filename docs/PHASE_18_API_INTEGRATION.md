# CARTIVA MINI — PHASE 18 API INTEGRATION CATALOG & CONTRACTS

**Project:** Cartiva Mini  
**Phase:** 18 of 20 (Full-Stack Integration & Optimization)  
**Status:** COMPLETE & VERIFIED  

---

## 1. API Architecture Overview

The Cartiva Mini backend provides a unified, RESTful API under the `/api/v1` namespace. Every endpoint conforms to standard HTTP verbs, strict payload validation via Zod, unified JSON response envelopes, and secure status code semantics.

### Standard Response Envelopes

#### Success Envelope (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation message",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Error Envelope (`400`, `401`, `403`, `404`, `409`, `422`, `500`)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_ENUM_CODE",
    "message": "Human-readable explanation of error condition",
    "details": [
      {
        "field": "customerEmail",
        "message": "Invalid email address format"
      }
    ],
    "requestId": "6b56ff7d-6529-4b90-971d-3b51737ed85c"
  }
}
```

---

## 2. Comprehensive Endpoint Catalog

### 2.1 Authentication & Session Management (`/api/v1/auth`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register customer account with email, name, and password |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user; returns JWT access token + HTTP-only refresh cookie |
| `POST` | `/api/v1/auth/refresh` | Public | Rotate refresh token; issues new access token & refresh cookie |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke current session and clear refresh cookie |
| `POST` | `/api/v1/auth/logout-all` | Authenticated | Revoke all active user sessions across devices |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve profile and roles of authenticated user |
| `POST` | `/api/v1/auth/verify-email/request` | Authenticated | Send new 6-digit email verification OTP |
| `POST` | `/api/v1/auth/verify-email` | Public / Auth | Submit 6-digit OTP code to verify account |
| `POST` | `/api/v1/auth/forgot-password` | Public | Request password reset email token |
| `POST` | `/api/v1/auth/reset-password` | Public | Reset password using reset token |

### 2.2 Customer Profile & Account Management (`/api/v1/users`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/users/me` | Customer / Staff / Admin | Get complete customer profile |
| `PATCH` | `/api/v1/users/me` | Customer / Staff / Admin | Update customer personal information |
| `PATCH` | `/api/v1/users/me/password` | Customer / Staff / Admin | Change customer password |
| `POST` | `/api/v1/users/me/email-change` | Customer / Staff / Admin | Request email address change verification |
| `POST` | `/api/v1/users/me/email-change/verify` | Customer / Staff / Admin | Verify and commit email address change |
| `GET` | `/api/v1/users/me/addresses` | Customer / Staff / Admin | List saved customer delivery addresses |
| `POST` | `/api/v1/users/me/addresses` | Customer / Staff / Admin | Add new customer delivery address |
| `PATCH` | `/api/v1/users/me/addresses/:id` | Customer / Staff / Admin | Update existing delivery address |
| `DELETE` | `/api/v1/users/me/addresses/:id` | Customer / Staff / Admin | Remove saved delivery address |
| `GET` | `/api/v1/users/me/dashboard` | Customer / Staff / Admin | Customer dashboard overview metrics |

### 2.3 Catalog, Products & Discovery (`/api/v1/products`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/products` | Public | Paginated product listing with filters and sorting |
| `GET` | `/api/v1/products/search` | Public | Tokenized full-text regex search across title, brand, SKU |
| `GET` | `/api/v1/products/categories` | Public | Hierarchical category navigation tree |
| `GET` | `/api/v1/products/:slug` | Public | Detailed product document by URL slug |

### 2.4 Shopping Cart & Wishlist (`/api/v1/cart`, `/api/v1/wishlist`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/cart` | Public (Session) / Auth | Retrieve active cart with realtime inventory checks |
| `POST` | `/api/v1/cart/items` | Public (Session) / Auth | Add product or variant to cart |
| `PATCH` | `/api/v1/cart/items/:itemId` | Public (Session) / Auth | Update line item quantity |
| `DELETE` | `/api/v1/cart/items/:itemId` | Public (Session) / Auth | Remove line item from cart |
| `POST` | `/api/v1/cart/merge` | Authenticated | Atomically merge guest session cart into user cart |
| `GET` | `/api/v1/wishlist` | Authenticated | Retrieve customer wishlist items |
| `POST` | `/api/v1/wishlist/toggle` | Authenticated | Toggle product in/out of customer wishlist |

### 2.5 Regional Shipping & Delivery Calculation (`/api/v1/shipping`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/shipping/methods` | Public / Auth | List available shipping methods for a state/country |
| `GET` | `/api/v1/shipping/availability` | Public / Auth | Check serviceability for country and state |
| `POST` | `/api/v1/shipping/quotes` | Authenticated | Calculate live shipping fee based on address and cart weight |

### 2.6 Checkout, Orders & Fulfilment (`/api/v1/checkout`, `/api/v1/orders`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/checkout/summary` | Authenticated | Retrieve checkout summary with line items, tax, shipping |
| `POST` | `/api/v1/checkout/session` | Authenticated | Initialize checkout session and lock cart pricing |
| `POST` | `/api/v1/checkout/place-order` | Authenticated | Finalize checkout, create order, and reserve inventory |
| `GET` | `/api/v1/orders` | Authenticated | Customer's paginated order history |
| `GET` | `/api/v1/orders/:orderId` | Authenticated | Single order detail with items and status timeline |
| `POST` | `/api/v1/orders/:orderId/cancel` | Authenticated | Cancel pending order and release reserved stock |
| `GET` | `/api/v1/orders/:orderId/tracking` | Authenticated | Real-time shipment tracking milestones and waypoints |

### 2.7 Payment Processing & Webhooks (`/api/v1/payments`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/payments/initialize` | Authenticated | Initialize Paystack transaction; returns access_code and auth URL |
| `GET` | `/api/v1/payments/verify/:reference` | Authenticated | Reconcile Paystack payment status with local order |
| `POST` | `/api/v1/payments/webhook` | Paystack System | HMAC SHA512 verified Paystack event webhook |
| `GET` | `/api/v1/payments/history` | Authenticated | Customer payment transaction history |

### 2.8 Administrative Control Center (`/api/v1/admin/*`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/dashboard` | Admin / Staff | Global sales KPIs, revenue graphs, order counts |
| `GET` | `/api/v1/admin/orders` | Admin / Staff | Paginated platform order management |
| `PATCH` | `/api/v1/admin/orders/:orderId/status`| Admin / Staff | Advance order lifecycle (Processing, Shipped, Delivered) |
| `GET` | `/api/v1/admin/orders/:orderId/audit` | Admin / Staff | Audit log of state changes for an order |
| `GET` | `/api/v1/admin/inventory` | Admin / Staff | Real-time stock levels, low-stock warnings |
| `POST` | `/api/v1/admin/inventory/:id/receive` | Admin / Staff | Restock inventory and generate movement entry |
| `PATCH` | `/api/v1/admin/inventory/:id/threshold`| Admin / Staff | Modify reorder threshold level |
| `POST` | `/api/v1/admin/products` | Admin / Staff | Create new catalog product with image uploads |
| `PATCH` | `/api/v1/admin/products/:id` | Admin / Staff | Update product pricing, description, and status |
| `GET` | `/api/v1/admin/audit-logs` | Admin / Staff | Platform-wide immutable audit trail |
| `GET` | `/api/v1/admin/shipping/configs` | Admin / Staff | Manage regional delivery zones and rate tables |

---

## 3. Middleware Pipeline

```
Incoming Request
       │
       ▼
1. Request ID Middleware (`X-Request-ID` attached to request context)
       │
       ▼
2. Security Headers (Helmet: HSTS, X-Content-Type-Options, Frameguard)
       │
       ▼
3. CORS Policy (Controlled origins for storefront and admin port)
       │
       ▼
4. Rate Limiting Middleware (General tier + Aggressive Auth tier)
       │
       ▼
5. Body Parsing (JSON parser + raw body parser preserved for Paystack webhook)
       │
       ▼
6. Authentication & RBAC Middleware (`authenticateJWT`, `requireRole`)
       │
       ▼
7. Schema Validation Middleware (Zod schema checking on `body`, `query`, `params`)
       │
       ▼
8. Controller Execution -> Service Execution -> MongoDB Query
       │
       ▼
9. Centralized Error Handler (Transforms exceptions into standard JSON error envelopes)
```

