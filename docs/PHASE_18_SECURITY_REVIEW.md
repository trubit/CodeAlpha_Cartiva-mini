# CARTIVA MINI — PHASE 18 SECURITY REVIEW & HARDENING

**Project:** Cartiva Mini  
**Phase:** 18 of 20 (Full-Stack Integration & Optimization)  
**Status:** COMPLETE & VERIFIED  

---

## 1. Security Architecture Summary

Cartiva Mini adheres to modern defense-in-depth security standards across all layers of the stack. Untrusted client input is intercepted and sanitized before touching database queries, authentication state is protected against token replay and session hijacking, and cryptographic signatures guard financial webhook transactions.

---

## 2. Authentication & Credential Hardening

| Security Control | Implementation | Verification |
|---|---|---|
| **Password Hashing** | Argon2id / Bcrypt with salted cost parameters | Tested in `registration.test.ts` |
| **Access Tokens** | Short-lived signed JWTs (15-minute expiry) | Verified in `tokens-and-sessions.test.ts` |
| **Refresh Tokens** | Cryptographically secure random tokens stored in HTTP-only, SameSite, Secure cookies | Verified in `tokens-and-sessions.test.ts` |
| **Token Rotation** | Automatic one-time token rotation on `/api/v1/auth/refresh` | Verified in `tokens-and-sessions.test.ts` |
| **Replay Attack Detection** | Reusing a previously exchanged refresh token immediately revokes all sessions associated with that user family | Verified in `tokens-and-sessions.test.ts` |
| **Session Revocation** | Dedicated `/logout` and `/logout-all` endpoints with database-level session invalidation | Verified in `tokens-and-sessions.test.ts` |
| **Two-Factor / OTP** | 6-digit cryptographic verification OTP codes with 10-minute expiry windows | Verified in `email-verification.test.ts` |

---

## 3. Authorization & Access Control (RBAC)

The application enforces strict role segregation:
* **`customer`**: Restricted strictly to own profile, own carts, own wishlist, and own placed orders.
* **`staff`**: Access to operational order management, customer support tickets, and fulfilment workflows.
* **`admin` / `super_admin`**: Full platform control, inventory initialization, price overrides, and system audit logs.

### IDOR (Insecure Direct Object Reference) Defenses
* `/api/v1/orders/:orderId`: The service verifies `order.userId.toString() === request.user.id`. Any unauthorized attempt triggers a `403 Forbidden` response.
* `/api/v1/users/me/addresses/:id`: Delivery addresses are scoped to the authenticated caller's record. Addressing other user IDs is impossible.

---

## 4. Payment Gateway & Webhook Security

1. **HMAC SHA512 Verification:**
   Paystack webhook payloads transmitted to `/api/v1/payments/webhook` are validated by re-computing the HMAC SHA512 signature using the server's `PAYSTACK_SECRET_KEY` against the buffered raw request body:
   ```typescript
   const hash = crypto
     .createHmac('sha512', config.payment.paystackSecretKey)
     .update(rawBody)
     .digest('hex');
   if (hash !== req.headers['x-paystack-signature']) {
     throw new UnauthorizedException('Invalid webhook signature');
   }
   ```
2. **Raw Body Integrity:** Express JSON parsing does not mutate or re-serialize webhook payloads prior to signature checking.
3. **No Direct Cardholder Data Stored:** Credit card numbers, CVVs, and banking PINs never touch Cartiva Mini servers; transactions are tokenized and processed inside Paystack's PCI-DSS Level 1 compliant checkout infrastructure.

---

## 5. Network & HTTP Header Defenses

* **Helmet Configuration:**
  - `X-Content-Type-Options: nosniff` (MIME-sniffing prevention)
  - `X-Frame-Options: SAMEORIGIN` (Clickjacking defense)
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)
  - `Cross-Origin-Opener-Policy: same-origin`
* **Content Security Policy (CSP):**
  - Integrated with Paystack checkout assets (`https://checkout.paystack.com`, `https://api.paystack.co`) and report-only telemetry handling.
* **Rate Limiting:**
  - Public endpoints: 100 requests per 15-minute window.
  - Sensitive authentication endpoints (`/login`, `/register`, `/forgot-password`, `/verify-email`): 10 requests per 15-minute window per IP to eliminate brute-force and credential stuffing threats.

