# Full-Stack Integration Architecture — Cartiva Mini

**Project:** Cartiva Mini  
**Phase:** 18 (Integration & Verification)  
**Status:** Approved & Implemented  

---

## 1. Architectural Topology

Cartiva Mini integrates a decoupled modern Single-Page Application (SPA) frontend with an authoritative Node.js/Express REST backend backed by MongoDB.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT SPA (Port 5180)                            |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |    Public Layout   |   |   Auth Layout         |   | Portal Layouts         |  |
|  |  (Storefront/Nav)  |   |  (Login/OTP/Register) |   | (Customer / Admin)     |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
|            |                         |                            |               |
|            +-------------------------+----------------------------+               |
|                                      |                                            |
|                 AppSessionInitializer (Silent Boot Check)                         |
|                                      |                                            |
|                  Axios Client with In-Memory Token Handling                       |
+--------------------------------------|--------------------------------------------+
                                       | HTTP / REST (withCredentials: true)
                                       v
+-----------------------------------------------------------------------------------+
|                             BACKEND API SERVER (Port 5000)                        |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |   Auth Middleware  |   | Rate Limit / Security |   | Validation Middleware  |  |
|  |   (JWT & Cookies)  |   | (Helmet, CORS, CSRF)  |   | (Zod Schemas)          |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
|                                      |                                            |
|             API Routers (/api/v1/auth, /products, /cart, /checkout, etc.)         |
|                                      |                                            |
|                               Service Layer                                       |
|             (OrderService, PaymentService, NotificationOutboxService)             |
+--------------------------------------|--------------------------------------------+
                                       | Mongoose ODM
                                       v
+-----------------------------------------------------------------------------------+
|                                MONGODB DATABASE                                   |
|   Users, Products, Categories, Carts, Orders, Payments, Inventory, Outbox         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Cross-Cutting Integration Workflows

### 2.1 Authentication & Silent Refresh
1. On initial mount, `AppSessionInitializer` dispatches `POST /api/v1/auth/refresh`.
2. The browser automatically attaches the `httpOnly` refresh token cookie.
3. If valid: The backend responds with a fresh 15-minute access token and user metadata. The frontend updates Zustand `useAuthStore` in memory.
4. If invalid / missing: Returns 401. The frontend silently sets `isLoading: false`, `isAuthenticated: false`, enabling instant guest browsing without redirect loops.

### 2.2 Shopping Cart Synchronization
1. Unauthenticated shoppers use a persistent guest cart backed by a client-generated UUID in `session-id`.
2. Upon customer registration or login, the frontend dispatches `POST /api/v1/cart/merge`.
3. The backend merges guest items with any existing customer cart, recalculates server-authoritative line totals, and returns the merged cart.

### 2.3 Server-Authoritative Checkout & Payment
1. Checkout validation occurs strictly on the backend: pricing, shipping calculations, and coupon discounts are re-evaluated from database documents.
2. An atomic inventory reservation (`InventoryReservation`) is created with a 30-minute TTL.
3. Paystack transaction is initialized via `POST /api/v1/payments/initialize`.
4. Paystack callback redirects to `/payment/callback`.
5. The frontend calls `GET /api/v1/payments/verify/:reference`.
6. The backend verifies transaction status with Paystack's REST API using the private secret key. Only a verified status transitions the order to `confirmed` and `paid`.

