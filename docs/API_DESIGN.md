# Cartiva Mini — RESTful API Architecture & Contract Specification

**Document Version:** 1.0.0  
**Phase:** Phase 1: Project Discovery, Architecture & Technical Planning  
**Date:** November 2026  
**Author:** Senior Full-Stack Software Architect & API Specialist  
**Classification:** API Design Deliverable

---

## 1. Architectural Standards & Design Conventions

The Cartiva Mini backend exposes a predictable, fully typed, RESTful API versioned under the `/api/v1` namespace.

### Core Principles

1. **Predictable Resource-Oriented URLs:** Plural nouns represent collections (e.g., `/api/v1/products`, `/api/v1/orders`), with sub-resources nested logically (e.g., `/api/v1/orders/:id/tracking`).
2. **Standard HTTP Methods:**
   - `GET`: Safe, idempotent retrieval. Never modifies server state.
   - `POST`: Creates new resources or triggers transactional operations (e.g., checkout initialization).
   - `PUT`: Complete idempotent resource replacement.
   - `PATCH`: Partial resource modification.
   - `DELETE`: Idempotent resource removal or soft-archival.
3. **Standardized HTTP Status Codes:**
   - `200 OK`: Request succeeded; returns data payload.
   - `201 Created`: Resource successfully created (includes `Location` header where applicable).
   - `204 No Content`: Successful operation with empty payload (e.g., item deletion).
   - `400 Bad Request`: Malformed JSON or generic client error.
   - `401 Unauthorized`: Missing, expired, or invalid JWT access token.
   - `403 Forbidden`: Authenticated user lacks required role/permission (e.g., non-admin accessing admin route).
   - `404 Not Found`: Requested resource does not exist.
   - `409 Conflict`: Unique constraint violation (e.g., duplicate email or SKU).
   - `422 Unprocessable Entity`: Request body failed Zod schema validation.
   - `429 Too Many Requests`: Exceeded rate limit quota.
   - `500 Internal Server Error`: Unhandled server exception.

---

## 2. Standardized Response & Error Envelopes

Every API response adheres to a strict isomorphic envelope format, making client consumption consistent and type-safe via shared TypeScript definitions.

### 2.1 Success Response Envelope

```typescript
interface ApiResponse<T> {
  success: true;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}
```

### 2.2 Error Response Envelope

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string; // e.g., 'VALIDATION_ERROR', 'UNAUTHORIZED', 'RESOURCE_NOT_FOUND', 'INSUFFICIENT_STOCK'
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
    timestamp: string;
    requestId: string;
  };
}
```

---

## 3. Comprehensive Endpoint Inventory

---

### 3.1 Authentication & Authorization Module (`/api/v1/auth`)

| Method | Endpoint                       | Auth            | Request Body                                       | Response Data                                              | Rate Limit       |
| ------ | ------------------------------ | --------------- | -------------------------------------------------- | ---------------------------------------------------------- | ---------------- |
| `POST` | `/api/v1/auth/register`        | Public          | `{ email, password, firstName, lastName, phone? }` | User profile + access token                                | 5 req / 15 min   |
| `POST` | `/api/v1/auth/login`           | Public          | `{ email, password }`                              | User profile + access token (sets httpOnly refresh cookie) | 5 req / 15 min   |
| `POST` | `/api/v1/auth/refresh-token`   | Public (Cookie) | None                                               | Fresh JWT access token                                     | 30 req / 15 min  |
| `POST` | `/api/v1/auth/logout`          | Authenticated   | None                                               | `{ loggedOut: true }` (clears cookie)                      | 60 req / 15 min  |
| `POST` | `/api/v1/auth/forgot-password` | Public          | `{ email }`                                        | Success message (generic to prevent enumeration)           | 3 req / hour     |
| `POST` | `/api/v1/auth/reset-password`  | Public          | `{ token, newPassword }`                           | Password reset confirmation                                | 5 req / hour     |
| `POST` | `/api/v1/auth/verify-email`    | Public          | `{ token }`                                        | Email verification status                                  | 10 req / hour    |
| `GET`  | `/api/v1/auth/me`              | Authenticated   | None                                               | Current user profile & role                                | 120 req / 15 min |

---

### 3.2 Users & Address Management (`/api/v1/users`, `/api/v1/addresses`)

| Method   | Endpoint                            | Auth     | Request Body                                                                                   | Response Data               |
| -------- | ----------------------------------- | -------- | ---------------------------------------------------------------------------------------------- | --------------------------- |
| `PATCH`  | `/api/v1/users/profile`             | Customer | `{ firstName?, lastName?, phone? }`                                                            | Updated profile             |
| `PATCH`  | `/api/v1/users/change-password`     | Customer | `{ currentPassword, newPassword }`                                                             | Success confirmation        |
| `GET`    | `/api/v1/addresses`                 | Customer | None                                                                                           | Array of customer addresses |
| `POST`   | `/api/v1/addresses`                 | Customer | `{ recipientName, phone, streetAddress, city, state, postalCode, country, isDefaultShipping }` | Created Address document    |
| `PUT`    | `/api/v1/addresses/:id`             | Customer | Address payload                                                                                | Updated Address document    |
| `DELETE` | `/api/v1/addresses/:id`             | Customer | None                                                                                           | `204 No Content`            |
| `PATCH`  | `/api/v1/addresses/:id/set-default` | Customer | `{ type: 'shipping' \| 'billing' }`                                                            | Updated default address     |

---

### 3.3 Product Catalog & Categories (`/api/v1/products`, `/api/v1/categories`)

| Method   | Endpoint                      | Auth          | Query / Request Body                                                      | Response Data                                       |
| -------- | ----------------------------- | ------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| `GET`    | `/api/v1/products`            | Public        | Query: `page, limit, category, search, minPrice, maxPrice, sort, inStock` | Paginated product array + facets + meta             |
| `GET`    | `/api/v1/products/featured`   | Public        | None                                                                      | Top featured products                               |
| `GET`    | `/api/v1/products/:slug`      | Public        | None                                                                      | Product detail document + variants + rating summary |
| `GET`    | `/api/v1/categories`          | Public        | Query: `activeOnly`                                                       | Nested category hierarchy tree                      |
| `GET`    | `/api/v1/categories/:slug`    | Public        | None                                                                      | Category detail & subcategories                     |
| `POST`   | `/api/v1/products`            | Admin / Staff | Full product creation payload                                             | Created product document                            |
| `PUT`    | `/api/v1/products/:id`        | Admin / Staff | Full product update payload                                               | Updated product document                            |
| `PATCH`  | `/api/v1/products/:id/status` | Admin         | `{ status: 'draft' \| 'published' \| 'archived' }`                        | Updated product                                     |
| `DELETE` | `/api/v1/products/:id`        | Admin         | None                                                                      | `204 No Content` (Soft-archive)                     |
| `POST`   | `/api/v1/categories`          | Admin         | `{ name, slug, parentId?, imageUrl?, displayOrder? }`                     | Created category                                    |
| `PUT`    | `/api/v1/categories/:id`      | Admin         | Category update payload                                                   | Updated category                                    |
| `DELETE` | `/api/v1/categories/:id`      | Admin         | None                                                                      | `204 No Content`                                    |

---

### 3.4 Shopping Cart & Wishlist (`/api/v1/cart`, `/api/v1/wishlist`)

| Method   | Endpoint                            | Auth              | Request Body                             | Response Data                             |
| -------- | ----------------------------------- | ----------------- | ---------------------------------------- | ----------------------------------------- |
| `GET`    | `/api/v1/cart`                      | Public / Customer | None (uses Auth Token or Session Cookie) | Full Cart document with item calculations |
| `POST`   | `/api/v1/cart/items`                | Public / Customer | `{ productId, variantId?, quantity }`    | Updated Cart document                     |
| `PATCH`  | `/api/v1/cart/items/:itemId`        | Public / Customer | `{ quantity }`                           | Updated Cart document                     |
| `DELETE` | `/api/v1/cart/items/:itemId`        | Public / Customer | None                                     | Updated Cart document                     |
| `DELETE` | `/api/v1/cart/clear`                | Public / Customer | None                                     | Empty Cart document                       |
| `POST`   | `/api/v1/cart/apply-coupon`         | Public / Customer | `{ code }`                               | Cart with discounted subtotal             |
| `DELETE` | `/api/v1/cart/remove-coupon`        | Public / Customer | None                                     | Cart with restored regular subtotal       |
| `GET`    | `/api/v1/wishlist`                  | Customer          | None                                     | Customer wishlist items                   |
| `POST`   | `/api/v1/wishlist/items`            | Customer          | `{ productId }`                          | Updated wishlist                          |
| `DELETE` | `/api/v1/wishlist/items/:productId` | Customer          | None                                     | Updated wishlist                          |

---

### 3.5 Checkout, Orders & Fulfilment (`/api/v1/checkout`, `/api/v1/orders`)

| Method  | Endpoint                             | Auth              | Request Body                                                                                     | Response Data                                |
| ------- | ------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `POST`  | `/api/v1/checkout/initialize`        | Customer          | `{ addressId, couponCode?, notes? }`                                                             | Order draft + Paystack transaction reference |
| `GET`   | `/api/v1/orders`                     | Customer          | Query: `page, limit, status`                                                                     | Customer's paginated order list              |
| `GET`   | `/api/v1/orders/:orderNumber`        | Customer          | None                                                                                             | Order detail snapshot with timeline          |
| `GET`   | `/api/v1/orders/:orderNumber/track`  | Public / Customer | None (or verified phone/email)                                                                   | Public tracking milestone status             |
| `POST`  | `/api/v1/orders/:orderNumber/cancel` | Customer          | `{ reason }`                                                                                     | Cancellation confirmation (if eligible)      |
| `GET`   | `/api/v1/admin/orders`               | Admin / Staff     | Query: `status, paymentStatus, page, search`                                                     | Admin paginated order queue                  |
| `PATCH` | `/api/v1/admin/orders/:id/status`    | Admin / Staff     | `{ status: 'processing' \| 'shipped' \| 'delivered' \| 'cancelled', trackingNumber?, carrier? }` | Updated Order                                |

---

### 3.6 Payments & Financial Operations (`/api/v1/payments`)

| Method | Endpoint                             | Auth                | Request Body                                           | Response Data                              |
| ------ | ------------------------------------ | ------------------- | ------------------------------------------------------ | ------------------------------------------ |
| `POST` | `/api/v1/payments/verify/:reference` | Customer / Admin    | None                                                   | Payment verification status & order update |
| `POST` | `/api/v1/payments/webhook`           | External (Paystack) | Raw JSON payload (verified via `X-Paystack-Signature`) | `{ received: true }`                       |
| `GET`  | `/api/v1/admin/payments`             | Admin               | Query: `page, status, dateRange`                       | Paginated payments log                     |
| `POST` | `/api/v1/admin/payments/:id/refund`  | Admin               | `{ amount, reason }`                                   | Refund status & transaction record         |

---

### 3.7 Reviews & Ratings (`/api/v1/reviews`)

| Method  | Endpoint                              | Auth     | Request Body                                     | Response Data                           |
| ------- | ------------------------------------- | -------- | ------------------------------------------------ | --------------------------------------- |
| `GET`   | `/api/v1/products/:productId/reviews` | Public   | Query: `page, limit, rating`                     | Paginated reviews & rating distribution |
| `POST`  | `/api/v1/reviews`                     | Customer | `{ productId, rating, title, comment, images? }` | Created Review (Verified Buyer checked) |
| `POST`  | `/api/v1/reviews/:id/vote`            | Customer | `{ type: 'helpful' }`                            | Updated vote tally                      |
| `PATCH` | `/api/v1/admin/reviews/:id/status`    | Admin    | `{ status: 'approved' \| 'rejected' }`           | Moderated review                        |

---

### 3.8 Admin Management & Reporting (`/api/v1/admin`)

| Method  | Endpoint                            | Auth          | Query / Request Body                                    | Response Data                                        |
| ------- | ----------------------------------- | ------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `GET`   | `/api/v1/admin/dashboard/stats`     | Admin         | Query: `period: 'today' \| 'week' \| 'month' \| 'year'` | Revenue, orders count, low stock count, active users |
| `GET`   | `/api/v1/admin/reports/sales`       | Admin         | Query: `startDate, endDate, groupBy`                    | Time-series sales data & profit metrics              |
| `GET`   | `/api/v1/admin/inventory/low-stock` | Admin / Staff | None                                                    | Products below lowStockThreshold                     |
| `POST`  | `/api/v1/admin/inventory/adjust`    | Admin         | `{ productId, variantId?, quantityChange, reason }`     | Inventory movement record                            |
| `GET`   | `/api/v1/admin/audit-logs`          | Admin         | Query: `entity, actorId, page`                          | Paginated compliance audit trail                     |
| `GET`   | `/api/v1/admin/users`               | Admin         | Query: `role, search, page`                             | User management list                                 |
| `PATCH` | `/api/v1/admin/users/:id/role`      | Admin         | `{ role: 'customer' \| 'staff' \| 'admin' }`            | Updated user role                                    |

---

## 4. API Security & Rate Limiting Strategy

1. **Authentication:** Bearer token transmitted via standard `Authorization: Bearer <token>` header. Token payload contains `userId`, `role`, and token version (`v`).
2. **Refresh Token Flow:** Issued as `httpOnly`, `Secure`, `SameSite=Strict` cookie to resist XSS theft.
3. **Webhook Security:** Paystack webhooks require HMAC-SHA512 verification:
   ```typescript
   const hash = crypto
     .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
     .update(rawBody)
     .digest('hex');
   if (hash !== req.headers['x-paystack-signature']) {
     return res.status(401).json({ error: 'Invalid webhook signature' });
   }
   ```
4. **Rate Limiting:**
   - Auth endpoints (login/register): 5 attempts per 15 minutes per IP.
   - General API endpoints: 100 requests per minute per IP.
   - Paystack Webhooks: Whitelisted Paystack IP blocks or signature validated without aggressive IP throttles.

---

## 5. Swagger / OpenAPI 3.0 Documentation Plan

In Phase 3 and Phase 5, an automated OpenAPI 3.0 specification will be exposed at `/api/docs` via `swagger-ui-express` generated directly from backend route definitions and Zod schemas using `zod-to-openapi` or `@asteasolutions/zod-to-openapi`.
