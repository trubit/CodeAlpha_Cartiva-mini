# CARTIVA MINI — PHASE 19 SECURITY AUDIT & HARDENING REPORT

**Project:** Cartiva Mini  
**Phase:** 19 of 20 (Comprehensive Testing, Code Review & Security Hardening)  
**Status:** COMPLETE & VERIFIED  

---

## 1. Security Assessment Methodology

The security audit evaluated Cartiva Mini against the **OWASP Top 10 (2021)** and **OWASP API Security Top 10 (2023)** standards across five principal defense domains:
1. Authentication, Credential Handling & Session Lifecycle
2. Authorization & Insecure Direct Object References (BOLA/BFLA)
3. Injection, Input Sanitization & Data Validation
4. Financial Transaction & Webhook Cryptographic Verification
5. Network Transport & HTTP Security Headers

---

## 2. Findings & Verification Matrix

### 2.1 Authentication & Credential Storage

| Security Control | Technical Implementation | Audit Assessment |
|---|---|---|
| **Password Storage** | Passwords hashed using Argon2id / Bcrypt with unique salt rounds prior to persistence. Plaintext passwords never logged or saved. | **PASS** — Verified in `registration.test.ts`. |
| **Token Architecture** | Short-lived signed JWT access tokens (15 minutes) paired with cryptographically secure refresh tokens stored in HTTP-only, SameSite, Secure cookies. | **PASS** — Verified in `tokens-and-sessions.test.ts`. |
| **Token Rotation** | Every invocation of `/api/v1/auth/refresh` revokes the old refresh token and issues a new token pair. | **PASS** — Verified in `tokens-and-sessions.test.ts`. |
| **Token Replay Detection** | Attempting to reuse an old/invalidated refresh token triggers family revocation, invalidating all sessions for that user account immediately. | **PASS** — Verified in `tokens-and-sessions.test.ts`. |
| **Two-Factor / Email OTP** | 6-digit numeric OTP codes hashed in database with a 10-minute expiry window. Malformed OTPs rejected with 422; expired codes rejected with 400. | **PASS** — Verified in `email-verification.test.ts`. |
| **Session Invalidation** | Dedicated `/logout` and `/logout-all` endpoints immediately remove session entries from MongoDB. | **PASS** — Verified in `tokens-and-sessions.test.ts`. |

### 2.2 Authorization & Access Control (OWASP API1 / API5)

* **Role-Based Access Control (RBAC):**
  - Public endpoints (`/shop`, `/products`, `/categories`) require no authentication.
  - Customer endpoints (`/cart`, `/orders`, `/users/me`) require valid customer tokens.
  - Administrative endpoints (`/admin/*`) require `staff`, `admin`, or `super_admin` roles. Customers attempting access receive `403 Forbidden`.
* **Insecure Direct Object Reference (IDOR / BOLA) Defenses:**
  - `GET /api/v1/orders/:orderId`: Validates that `order.userId.toString() === request.user.id`. Access to another user's order is strictly blocked with `403 Forbidden`.
  - `GET /api/v1/orders/:orderId/tracking`: Enforces customer ownership before displaying destination address snapshots or delivery milestones.
  - `/api/v1/users/me/addresses/:id`: Modification and deletion queries use compound criteria `{ _id: addressId, userId: request.user.id }`.

### 2.3 Injection Defenses & Data Sanitization (OWASP A03)

* **NoSQL Injection:**
  - All request parameters, queries, and bodies are strictly validated through Zod schemas before touching Mongoose models.
  - MongoDB queries utilize strict object keys, preventing operator injection (`{ $gt: "" }`).
* **Cross-Site Scripting (XSS):**
  - React's JSX automatically escapes strings during DOM rendering.
  - HTML content in user inputs is stripped and sanitized.
* **Mass Assignment:**
  - DTOs enforce strict whitelisting via Zod `.strip()` or explicit field picking. Sensitive model fields like `role`, `isEmailVerified`, and `passwordHash` cannot be set by customer endpoints.

### 2.4 Payment Gateway & Webhook Cryptography (OWASP API8)

* **HMAC SHA512 Signature Validation:**
  Every webhook request to `/api/v1/payments/webhook` must provide an `x-paystack-signature` header. The server re-computes the HMAC SHA512 hash over the unmutated raw request body using `PAYSTACK_SECRET_KEY`:
  ```typescript
  const computedHash = crypto
    .createHmac('sha512', config.payment.paystackSecretKey)
    .update(rawBody)
    .digest('hex');
  if (computedHash !== req.headers['x-paystack-signature']) {
    throw new UnauthorizedException('Invalid webhook signature');
  }
  ```
* **Tamper Rejection:** Verified in `tests/payment/payment-gateway.test.ts` (tampered payloads return 401).
* **Payment Idempotency:** Webhook processing checks if the transaction reference is already marked as `paid`. Duplicate events return `200 OK` without creating duplicate orders or double-allocating stock.

### 2.5 HTTP Headers & Network Security

* **Helmet Configuration:**
  - `X-Content-Type-Options: nosniff` (Active)
  - `X-Frame-Options: SAMEORIGIN` (Active)
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Active)
  - `Cross-Origin-Opener-Policy: same-origin` (Active)
* **Rate Limiting:**
  - General API: 100 requests per 15-minute sliding window per IP.
  - Sensitive Auth Endpoints (`/login`, `/register`, `/forgot-password`, `/verify-email`): 10 requests per 15-minute window to mitigate brute-force and credential stuffing attacks.

---

## 3. Security Findings Summary

| ID | Title | Severity | Status | Mitigation |
|---|---|---|---|---|
| SEC-01 | Rate Limiting on Auth Endpoints | High | **RESOLVED** | Applied `authRateLimiter` (10 req/15min) |
| SEC-02 | Webhook Signature Verification | Critical | **RESOLVED** | Enforced HMAC SHA512 with raw body buffering |
| SEC-03 | Customer Order IDOR Exposure | High | **RESOLVED** | Enforced `order.userId === user.id` in order service |
| SEC-04 | Refresh Token Replay Window | High | **RESOLVED** | Implemented token rotation & session family revocation |
| SEC-05 | Zod Memory Consumption on Constrained Collections | Medium | **MONITORED** | Request body size limit enforced at 1MB by Express |

---

## 4. Audit Conclusion

The application demonstrates strong defense-in-depth architecture. All critical and high-severity security concerns are resolved and verified by automated integration tests.

