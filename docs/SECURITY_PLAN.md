# Cartiva Mini — Application Security Architecture & Hardening Plan

**Document Version:** 1.0.0  
**Phase:** Phase 1: Project Discovery, Architecture & Technical Planning  
**Date:** November 2026  
**Author:** Application Security Specialist & Senior Technical Lead  
**Classification:** Security Architecture Deliverable

---

## 1. Threat Modeling & Security Philosophy

As an enterprise e-commerce system handling customer identities, addresses, and financial transactions, Cartiva Mini adheres to a **Zero-Trust Defense-in-Depth** security philosophy. Every layer—from network ingress, HTTP headers, authentication tokens, and request validation to database operations and third-party webhooks—operates under the assumption that external inputs and perimeter defenses can be compromised.

### Core Security Mandates

1. **Never Store Plaintext Passwords:** Passwords must be hashed using `bcrypt` with a minimum work factor of 12.
2. **Never Trust Client-Side Payment Confirmations:** Frontend callbacks indicating successful payments are treated as untrusted hints. An order is marked as paid only after verifiable backend-to-backend cryptographic confirmation.
3. **No Financial Cardholder Data (PCI-DSS Scope Minimization):** Cartiva Mini servers never collect, process, or store raw credit/debit card numbers (PANs), CVVs, or card PINs. Payment collection is delegated entirely to Paystack's PCI-DSS Level 1 compliant infrastructure.
4. **Strict Isolation of Sensitive Secrets:** Database URIs, payment gateway secret keys, JWT secrets, and email SMTP passwords must remain exclusively on the server and never be bundled into the client Vite artifact.
5. **Zero Tolerance for Broken Access Control (IDOR Mitigation):** Database queries fetching customer data (Orders, Carts, Addresses) must always include the authenticated `userId` as an immutable filter condition.

---

## 2. Authentication Architecture

The platform implements a stateless, dual-token **JWT (JSON Web Token)** authentication system combined with secure, encrypted token exchange.

```
+---------------------------------------------------------------------------------------------------+
|                                 AUTHENTICATION TOKEN TOPOLOGY                                     |
+---------------------------------------------------------------------------------------------------+
|  Token Type     | Storage Mechanism     | Lifespan    | Transmission Mode        | Purpose        |
+-----------------+-----------------------+-------------+--------------------------+----------------+
| Access Token    | In-Memory (Zustand)   | 15 Minutes  | Authorization: Bearer    | API Auth Guard |
| Refresh Token   | httpOnly Cookie       | 7 Days      | Cookie: Secure; SameSite | Token Rotation |
| Email Verify    | MongoDB (Hashed)      | 24 Hours    | URL Parameter            | Verification   |
| Password Reset  | MongoDB (Hashed)      | 1 Hour      | URL Parameter            | Account Recov. |
+---------------------------------------------------------------------------------------------------+
```

### 2.1 Password Hashing & Storage

- **Algorithm:** `bcrypt` with salt rounds set to `12`.
- **Pre-Save Hook:** The Mongoose `User` model executes a pre-save hook that hashes modified passwords automatically, eliminating risk of developer omission.
- **Complexity Requirements:** Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol (`@$!%*?&#`).

### 2.2 Dual-Token Lifecycle & Token Rotation

1. **Login Issuance:** Upon successful verification of email and password, the server generates:
   - **Access Token:** Short-lived (15 minutes), containing `{ sub: user._id, role: user.role, tokenVersion: user.tokenVersion }`. Returned in the JSON response body and stored strictly in-memory by the React client.
   - **Refresh Token:** Long-lived (7 days), signed with a distinct `JWT_REFRESH_SECRET`. Dispatched to the client via an HTTP cookie configured with:
     ```
     httpOnly: true;
     secure: true; // HTTPS only
     sameSite: 'strict';
     path: '/api/v1/auth/refresh-token';
     maxAge: 7 * 24 * 60 * 60 * 1000;
     ```
2. **Silent Refresh:** When the access token expires, Axios response interceptors intercept the `401 Unauthorized` response and trigger a `POST /api/v1/auth/refresh-token`.
3. **Session Revocation via Token Versioning:** Each user document maintains a `tokenVersion: number`. When a user changes their password, requests logout from all devices, or is suspended by an administrator, `tokenVersion` increments, instantly invalidating all outstanding access and refresh tokens.

### 2.3 Account Lockout & Brute-Force Defense

- **Exponential Backoff:** If a user account records 5 consecutive failed login attempts within 15 minutes, `user.lockUntil` is set to 30 minutes in the future, blocking further login attempts regardless of credential validity.
- **Generic Responses:** Password recovery and failed login endpoints return generic status messages (e.g., _"Invalid email or password"_, _"If an account exists, a reset link has been dispatched"_) to prevent user enumeration attacks.

---

## 3. Role-Based Access Control (RBAC)

Cartiva Mini implements a hierarchical RBAC matrix enforced via reusable Express middleware:

```
                  ┌──────────────────────┐
                  │        ADMIN         │ (Full platform control, audit logs, financials)
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │        STAFF         │ (Order fulfillment, catalog & inventory management)
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │       CUSTOMER       │ (Shopping, reviews, personal addresses & orders)
                  └──────────────────────┘
```

### 3.1 Permission Matrix

| Module / Action                           | Customer      | Staff         | Admin         |
| ----------------------------------------- | ------------- | ------------- | ------------- |
| Browse Catalog & Categories               | Allowed       | Allowed       | Allowed       |
| Manage Personal Cart & Wishlist           | Allowed (Own) | Allowed (Own) | Allowed (Own) |
| Place Order & Complete Payment            | Allowed (Own) | Allowed (Own) | Allowed (Own) |
| Submit Review on Purchased Item           | Allowed (Own) | Allowed (Own) | Allowed (Own) |
| Create / Edit Products & Categories       | Denied        | Allowed       | Allowed       |
| Update Order Fulfillment (Ship / Deliver) | Denied        | Allowed       | Allowed       |
| Adjust Inventory Quantities               | Denied        | Denied        | Allowed       |
| Create & Manage Coupon Campaigns          | Denied        | Denied        | Allowed       |
| Issue Payment Refunds                     | Denied        | Denied        | Allowed       |
| View Financial Reports & Metrics          | Denied        | Denied        | Allowed       |
| Inspect Compliance Audit Logs             | Denied        | Denied        | Allowed       |
| Manage User Roles & Permissions           | Denied        | Denied        | Allowed       |

### 3.2 IDOR Prevention Rule

Any route accessing customer records (`orders/:id`, `addresses/:id`, `cart`) must verify that:

```typescript
if (record.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
  throw new ForbiddenError('You do not have permission to access this resource.');
}
```

---

## 4. Payment Security & Financial Verification (Paystack)

Because payment vulnerabilities are critical risks, Cartiva Mini implements strict payment controls:

### 4.1 Zero-Trust Client Callbacks

The frontend payment modal (`PaystackPop.setup`) emits an `onSuccess(response)` callback upon payment completion. **This callback is never used to update database order status directly.** Instead:

1. The frontend notifies the server: `POST /api/v1/payments/verify/:reference`.
2. The server makes a secure server-to-server HTTPS call to `https://api.paystack.co/transaction/verify/${reference}` using the server-side `PAYSTACK_SECRET_KEY`.
3. The server compares:
   - `response.data.status === 'success'`
   - `response.data.amount === order.totalAmountInKobo`
   - `response.data.currency === order.currency`
4. Only when all assertions pass is the order updated to `processing` and payment status to `paid`.

### 4.2 Webhook Signature & Replay Attack Defense

Paystack asynchronous webhooks deliver ground-truth payment events (e.g., `charge.success`):

1. **Raw Body Integrity:** The `/api/v1/payments/webhook` route bypasses JSON body parsing to capture the exact incoming raw buffer.
2. **HMAC-SHA512 Signature Check:**
   ```typescript
   const expectedSignature = req.headers['x-paystack-signature'];
   const computedSignature = crypto
     .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
     .update(rawBody)
     .digest('hex');

   if (expectedSignature !== computedSignature) {
     logger.warn({ ip: req.ip }, 'Forged webhook attempt detected');
     return res.status(401).send('Invalid signature');
   }
   ```
3. **Idempotency Ledger:** The incoming `event.data.reference` is checked against the `payments` collection. If already marked `success`, the webhook immediately returns `200 OK` to prevent duplicate crediting or stock deductions.

---

## 5. Input Validation, Sanitization & Vulnerability Mitigations

### 5.1 Zod Runtime Validation

Every incoming HTTP request is validated against strict Zod schemas before hitting controller logic:

- Unknown fields are stripped automatically (`zodSchema.strict()` or `strip()`).
- Data types, string lengths, regex patterns, and numeric ranges are strictly enforced.

### 5.2 NoSQL Injection Prevention

- **Schema Enforcement:** Mongoose strictly casts queries against predefined schemas.
- **Operator Sanitization:** Middleware strips or escapes suspicious MongoDB operators (`$where`, `$gt`, `$ne`, `$regex`, `$expr`) from unparsed request payloads.

### 5.3 Cross-Site Scripting (XSS) Mitigation

- **Output Encoding:** React natively encodes variables rendered in JSX templates.
- **Sanitization of Rich Text:** Product descriptions and customer reviews pass through `sanitize-html` to strip dangerous HTML tags (`<script>`, `<iframe>`, `onload` attributes) before database storage.
- **Strict Content Security Policy (CSP):** Helmet configures script and object sources strictly.

### 5.4 Cross-Site Request Forgery (CSRF) Mitigation

- State-modifying requests require the JWT Bearer token in the `Authorization` header, which browsers never send automatically.
- Refresh token cookies utilize `SameSite: 'strict'` to prevent cross-site leakage.

---

## 6. Network, Transport & Header Hardening

### 6.1 Helmet Security Headers

The backend Express app configures Helmet with production-grade policies:

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://js.paystack.co'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", 'https://api.paystack.co'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 Year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);
```

### 6.2 CORS Policy

CORS is locked down to verified frontend origins:

```typescript
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);
```

### 6.3 Multi-Tier Rate Limiting

Rate limiting prevents denial-of-service, brute-force password cracking, and scraping:

1. **Auth Endpoints:** 5 requests per 15 minutes per IP (`/api/v1/auth/login`, `/api/v1/auth/register`).
2. **Password Recovery:** 3 requests per hour per IP (`/api/v1/auth/forgot-password`).
3. **General API:** 100 requests per 1 minute per IP.
4. **Checkout Initialization:** 10 attempts per hour per user account to mitigate payment spamming.

---

## 7. Audit Logging & Forensic Traceability

All high-privilege and state-altering administrative actions trigger an immutable record in the `audit_logs` collection:

- **Captured Data:** `actorId`, `actorRole`, `action`, `entity`, `entityId`, `ipAddress`, `userAgent`, `changesDiff`, and ISO timestamp.
- **Monitored Actions:** User role escalation, account suspension, product price edits, manual stock adjustments, coupon generation, order cancellations, and refunds.
- **Append-Only Enforcement:** The MongoDB driver and Mongoose hooks block any update or delete operations on the `AuditLog` model.

---

## 8. Pre-Production Security Hardening Checklist

Prior to entering Phase 20 (Production Deployment), the platform must satisfy every item on this verification checklist:

- [ ] All default test credentials and demo accounts removed from seeds.
- [ ] No plaintext secrets or API keys checked into version control (verified via automated git secrets scan).
- [ ] Production `.env` variables injected via secure orchestration (e.g., Docker secrets, cloud environment vaults).
- [ ] MongoDB connection requires TLS/SSL and authenticated user with least-privilege role.
- [ ] Paystack live keys active; test keys completely eradicated from production configuration.
- [ ] Cloudinary signed upload presets enforced; unauthenticated uploads disabled.
- [ ] SSL/TLS certificate configured with A+ grade on Qualys SSL Labs.
- [ ] Error handler suppresses internal database error codes and stack traces in production (`NODE_ENV === 'production'`).
- [ ] Automated dependency vulnerability audit (`npm audit`) reports zero high or critical vulnerabilities.
