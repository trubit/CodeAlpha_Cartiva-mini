# CARTIVA MINI — SESSION SECURITY & REFRESH TOKEN MANAGEMENT

## 1. Session Architecture Overview

Cartiva Mini implements a resilient, server-backed session management architecture combining **JSON Web Tokens (JWT) for stateless authorization** with **database-backed Session records for stateful revocation and replay detection**.

This hybrid architecture provides:

- **Low-Latency Verification:** Normal API endpoints verify access tokens locally using cryptographic signature validation without database queries on every sub-request.
- **Immediate Revocability:** Refresh operations and sensitive mutations consult the `Session` model, allowing instant invalidation of compromised credentials or stolen devices.

---

## 2. Token Transport Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       BROWSER CLIENT                        │
├──────────────────────────────┬──────────────────────────────┤
│     IN-MEMORY JAVASCRIPT     │       HTTP-ONLY COOKIE       │
│         (Short-Lived)        │         (Long-Lived)         │
│                              │                              │
│         Access Token         │        Refresh Token         │
│     Lifespan: 15 Minutes     │       Lifespan: 7 Days       │
│  Sent in Authorization Header│  Sent via Cookie: cartiva_   │
│  `Bearer <token>`            │  refresh_token               │
│                              │  HttpOnly: true              │
│  Protected from XSS          │  SameSite: Lax               │
│  Not in localStorage         │  Secure: true (Production)   │
└──────────────────────────────┴──────────────────────────────┘
```

### 2.1 Anti-XSS and Anti-LocalStorage Policy

- **Strict Prohibition of LocalStorage:** Refresh tokens are never exposed to JavaScript or stored in `localStorage` or `sessionStorage`. If a client-side Cross-Site Scripting (XSS) vulnerability occurs, the attacker cannot exfiltrate the persistent refresh token.
- **Memory-Only Access Token:** In the frontend SPA, access tokens are held exclusively in volatile memory (Zustand store / Axios closure). Closing the browser tab cleans the token.

### 2.2 Cookie Configuration

The refresh token cookie is configured via `backend/src/modules/auth/auth.constants.ts`:

```typescript
export const REFRESH_COOKIE_NAME = 'cartiva_refresh_token';

export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/api/v1/auth', // Scoped strictly to authentication endpoints
};
```

---

## 3. Session Model & Database Design

Sessions are stored in the MongoDB `sessions` collection (`backend/src/models/Session.model.ts`):

```typescript
export interface ISession {
  userId: string;
  sessionId: string; // UUID v4 identifier
  refreshTokenHash: string; // SHA-256 digest of active refresh token
  userAgent?: string; // Device / browser fingerprint
  ipAddress?: string; // Client IP address (privacy compliant)
  isRevoked: boolean; // Revocation flag
  expiresAt: Date; // Absolute session expiry (7 days)
  lastActiveAt: Date; // Timestamp of last token refresh
}
```

### 3.1 Automatic Data Pruning via MongoDB TTL Index

To prevent database bloating and memory degradation, the session collection defines a **Time-To-Live (TTL)** index on `expiresAt`:

```typescript
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

MongoDB's background TTL thread automatically deletes expired sessions without requiring manual cron jobs or cleanup workers.

---

## 4. Refresh Token Rotation (RTR) & Replay Detection

Refresh Token Rotation ensures that **every refresh token can only be used once**.

### 4.1 Normal Rotation Workflow

1. Client issues `POST /api/v1/auth/refresh` with the `cartiva_refresh_token` cookie.
2. Server verifies the token signature against `JWT_REFRESH_SECRET` and extracts `sessionId` and `userId`.
3. Server looks up the session in MongoDB:
   - Validates that `session.isRevoked === false`.
   - Validates that `session.expiresAt > Date.now()`.
   - Hashes incoming refresh token with SHA-256 and compares it against `session.refreshTokenHash`.
4. Server generates:
   - A new **Access Token** (15 min).
   - A new **Refresh Token** (7 days, unique `jti`).
5. Server updates the session record in MongoDB:
   - Sets `refreshTokenHash` to the hash of the new token.
   - Updates `lastActiveAt = new Date()`.
6. Server sends the new refresh token in a refreshed HttpOnly cookie and returns the access token in the response JSON.

### 4.2 Replay Detection & Breach Containment

If an attacker intercepts or steals a refresh token and attempts to use it after the legitimate customer has already rotated it (or vice versa):

1. The server computes the SHA-256 hash of the presented token.
2. The hash does not match `session.refreshTokenHash`.
3. **Breach Protocol Activated:**
   - The server immediately flags a token reuse incident.
   - The server **revokes all active sessions** for that user account:
     ```typescript
     await Session.updateMany({ userId: user._id }, { isRevoked: true });
     ```
   - The server increments `user.tokenVersion`.
   - The request is terminated with HTTP 401 (`INVALID_TOKEN`).
   - The compromised customer is forced to re-authenticate from scratch on all devices, completely severing the attacker's persistence.

---

## 5. Invalidation Matrix

| User Action                       | Single Session Revoked | All Sessions Revoked | Token Version Incremented | Cookie Cleared |
| --------------------------------- | :--------------------: | :------------------: | :-----------------------: | :------------: |
| `POST /auth/logout`               |          Yes           |          No          |            No             |      Yes       |
| `POST /auth/logout-all`           |          Yes           |         Yes          |            Yes            |      Yes       |
| `DELETE /auth/sessions/:id`       |     Selected only      |          No          |            No             |  Only if self  |
| `POST /auth/reset-password`       |          Yes           |         Yes          |            Yes            |      Yes       |
| `POST /auth/change-password`      |          Yes           |         Yes          |            Yes            |      Yes       |
| Refresh Token Replay Detected     |          Yes           |         Yes          |            Yes            |      Yes       |
| Account Deactivation / Suspension |          Yes           |         Yes          |            Yes            |      Yes       |
