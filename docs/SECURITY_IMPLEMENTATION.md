# Cartiva Mini — Security Architecture & Implementation

**Document Version:** 1.0.0  
**Phase:** Phase 3: Backend Foundation & Infrastructure  
**Date:** November 2026  
**Classification:** Application Security Architecture  
**Author:** Application Security Specialist

---

## 1. Executive Security Posture

Cartiva Mini adopts a **Defense-in-Depth** and **Zero-Trust** security architecture. Every incoming network request is treated as potentially adversarial until validated, sanitized, and authenticated.

---

## 2. Implemented Security Controls (Phase 3 Foundation)

### 2.1 HTTP Security Headers (Helmet)

Configured in `backend/src/config/security.ts` and attached globally via `helmetSecurity`:

- **Content Security Policy (CSP):** Restricts script, style, and media sources to trusted origins (`'self'`, Google Fonts, Paystack CDN, Cloudinary). Disallows inline object execution.
- **HTTP Strict Transport Security (HSTS):** `max-age=31536000` (1 year), `includeSubDomains`, and `preload`.
- **Clickjacking Defense:** `X-Frame-Options: DENY` and `frame-ancestors: 'none'`.
- **MIME Sniffing Prevention:** `X-Content-Type-Options: nosniff`.
- **Information Leak Prevention:** Removes `X-Powered-By: Express`.

### 2.2 Cross-Origin Resource Sharing (CORS)

Configured in `backend/src/config/cors.ts`:

- In production, requests are strictly compared against `env.FRONTEND_URL`. Unmatched origins are immediately blocked.
- In development, trusted local developer ports (`localhost:5180`, `localhost:5000`) are permitted.
- Supports credentials (cookies for JWT refresh tokens).
- Preflight requests (`OPTIONS`) are cached for 24 hours (`maxAge: 86400`) to optimize network overhead.

### 2.3 Tiered Rate Limiting

Configured in `backend/src/middleware/rate-limit.middleware.ts`:

- **Standard Tier:** Limits general API requests to 120 requests/minute per IP (1000 in test mode).
- **Strict Tier:** Prepared for sensitive actions (login, checkout, coupon application) capped at 20 requests/15 minutes.
- Standardized 429 response envelope with informative retry expectations.

### 2.4 Payload & Request Size Limits

- JSON body size is constrained to a maximum of `1MB` via `express.json({ limit: '1mb' })`.
- URL-encoded query buffers are constrained to `1MB`.
- Large payload attempts trigger an immediate `413 Payload Too Large` error, preventing memory exhaustion and denial-of-service attempts.

### 2.5 Request Tracing & Correlation

- `requestIdMiddleware` assigns or extracts a unique `X-Request-ID` (UUIDv4) for every request.
- Propagated back in response headers and injected into every log entry to provide full auditability across distributed boundaries.

### 2.6 Sensitive Data Sanitization

- Loggers explicitly omit password fields, JWT access/refresh tokens, and complete authorization headers.
- Stack traces are strictly suppressed from all API responses in non-development environments.

---

## 3. Scheduled Security Milestones (Roadmap)

| Security Control                     | Scheduled Phase | Description                                                                                |
| :----------------------------------- | :-------------- | :----------------------------------------------------------------------------------------- |
| **Dual-Token Authentication**        | Phase 5         | Short-lived in-memory access token (15m) + httpOnly, Secure, SameSite refresh cookie (7d). |
| **Role-Based Access Control (RBAC)** | Phase 5         | Strict permission enforcement for `CUSTOMER`, `ADMIN`, `SUPPORT_AGENT`, and `SUPER_ADMIN`. |
| **Payment Signature Verification**   | Phase 9         | HMAC-SHA512 webhook signature verification for Paystack events with replay attack defense. |
| **Database Encryption & Indexing**   | Phase 4         | Bcrypt password hashing (cost factor 12) and Mongoose schema sanitization.                 |
| **CSRF Defense**                     | Phase 5         | SameSite cookie policy combined with custom request headers.                               |
