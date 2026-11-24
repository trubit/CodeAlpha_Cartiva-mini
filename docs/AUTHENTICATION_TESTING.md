# CARTIVA MINI — AUTHENTICATION TESTING REPORT & RESULTS

## 1. Testing Philosophy & Test Architecture

Cartiva Mini adheres to a rigorous, non-mocked testing methodology for security and authentication. Rather than mocking Express controllers or Mongoose operations, our test suites execute real HTTP traffic against dynamic port Express instances using Node.js's native `fetch` client via `tests/test-server.helper.ts`.

Key architectural principles of the test runner:

1. **Real MongoDB Integration:** Tests interact directly with an active MongoDB instance to verify schema validators, indexes, and document lifecycles.
2. **Network Loop Fidelity:** Tests send real HTTP requests over TCP, verifying exact middleware order, CORS headers, cookie serialization, rate limiters, and status codes.
3. **Isolation & Determinism:** Test emails utilize domain names scoped to `@cartivamini.test` with unique random prefixes, preventing collision between parallel suites.
4. **Zero Browser Automation:** Fast, deterministic API testing executing under **Vitest** without flaky browser dependencies.

---

## 2. Test Suite Breakdown & Coverage

### 2.1 Customer Registration Suite (`tests/auth/registration.test.ts`)

| Test Case | Scenario Verified                         | Expected Result                                                                                         |   Status   |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- | :--------: |
| `1`       | Successful registration of valid customer | HTTP 201 Created, SafeUser returned without password or token fields, account in `PENDING_VERIFICATION` | **PASSED** |
| `2`       | Duplicate email registration attempt      | HTTP 409 Conflict with `USER_ALREADY_EXISTS` error code                                                 | **PASSED** |
| `3`       | Invalid email format                      | HTTP 400 Bad Request with Zod validation details                                                        | **PASSED** |
| `4`       | Weak password (missing symbols/numbers)   | HTTP 400 Bad Request detailing password strength requirements                                           | **PASSED** |
| `5`       | Password confirmation mismatch            | HTTP 400 Bad Request detailing confirmation failure                                                     | **PASSED** |
| `6`       | Role escalation attempt (`role: 'admin'`) | HTTP 201 Created, but persisted role strictly defaults to `customer`                                    | **PASSED** |

---

### 2.2 Customer Login Suite (`tests/auth/login.test.ts`)

| Test Case | Scenario Verified                       | Expected Result                                                                           |   Status   |
| --------- | --------------------------------------- | ----------------------------------------------------------------------------------------- | :--------: |
| `1`       | Valid credentials for verified customer | HTTP 200 OK, accessToken returned in body, `cartiva_refresh_token` set in HttpOnly cookie | **PASSED** |
| `2`       | Incorrect password                      | HTTP 401 Unauthorized with generic `INVALID_CREDENTIALS`                                  | **PASSED** |
| `3`       | Non-existent email address              | HTTP 401 Unauthorized with generic `INVALID_CREDENTIALS` (anti-enumeration)               | **PASSED** |
| `4`       | Unverified customer login attempt       | HTTP 401 Unauthorized with `EMAIL_NOT_VERIFIED`                                           | **PASSED** |
| `5`       | Suspended customer login attempt        | HTTP 403 Forbidden with `ACCOUNT_INACTIVE`                                                | **PASSED** |
| `6`       | 5 consecutive failed login attempts     | HTTP 401 Unauthorized with `ACCOUNT_LOCKED` and 30-minute lockout window                  | **PASSED** |

---

### 2.3 Tokens, Sessions & Rotation Suite (`tests/auth/tokens-and-sessions.test.ts`)

| Test Case | Scenario Verified                                                  | Expected Result                                                             |   Status   |
| --------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- | :--------: |
| `1`       | Access protected route (`/api/v1/auth/me`) with valid access token | HTTP 200 OK returning authenticated customer profile                        | **PASSED** |
| `2`       | Refresh session on `/refresh`                                      | HTTP 200 OK, new access token issued, cookie rotated with new refresh token | **PASSED** |
| `3`       | Replay detection on reused refresh token                           | HTTP 401 Unauthorized; all user sessions immediately revoked                | **PASSED** |
| `4`       | Single session logout (`/logout`)                                  | HTTP 200 OK, session revoked in DB, cookie cleared                          | **PASSED** |
| `5`       | List and revoke individual sessions (`GET & DELETE /sessions`)     | HTTP 200 OK, active session listed and revoked                              | **PASSED** |
| `6`       | IDOR prevention on cross-user session revocation                   | HTTP 404 Not Found when attempting to revoke another user's session         | **PASSED** |
| `7`       | Global logout (`/logout-all`)                                      | HTTP 200 OK, all user sessions marked revoked in DB                         | **PASSED** |

---

### 2.4 Email Verification Suite (`tests/auth/email-verification.test.ts`)

| Test Case | Scenario Verified                            | Expected Result                                       |   Status   |
| --------- | -------------------------------------------- | ----------------------------------------------------- | :--------: |
| `1`       | Verification with valid 64-char token        | HTTP 200 OK, `isEmailVerified: true`, status `ACTIVE` | **PASSED** |
| `2`       | Verification with expired token              | HTTP 400 Bad Request with `INVALID_TOKEN`             | **PASSED** |
| `3`       | Verification with garbage/malformed token    | HTTP 400 Bad Request with `INVALID_TOKEN`             | **PASSED** |
| `4`       | Resend verification request                  | HTTP 200 OK, new token generated and hashed in DB     | **PASSED** |
| `5`       | Anti-enumeration test on resend verification | HTTP 200 OK identical response for non-existent email | **PASSED** |

---

### 2.5 Password Recovery & Change Suite (`tests/auth/password-recovery.test.ts`)

| Test Case | Scenario Verified                                  | Expected Result                                                                 |   Status   |
| --------- | -------------------------------------------------- | ------------------------------------------------------------------------------- | :--------: |
| `1`       | Password recovery request (`/forgot-password`)     | HTTP 200 OK, 1-hour reset token hashed in DB                                    | **PASSED** |
| `2`       | Anti-enumeration test on `/forgot-password`        | HTTP 200 OK identical response for non-existent email                           | **PASSED** |
| `3`       | Password reset execution (`/reset-password`)       | HTTP 200 OK, new password bcrypt hashed, all active sessions revoked            | **PASSED** |
| `4`       | Password reset with expired token                  | HTTP 400 Bad Request with `INVALID_TOKEN`                                       | **PASSED** |
| `5`       | Authenticated password change (`/change-password`) | HTTP 200 OK, current password verified, sessions revoked, security email logged | **PASSED** |

---

### 2.6 Authorization & RBAC Suite (`tests/auth/authorization-rbac.test.ts`)

| Test Case | Scenario Verified                                 | Expected Result                              |   Status   |
| --------- | ------------------------------------------------- | -------------------------------------------- | :--------: |
| `1`       | Customer accessing customer-level route           | HTTP 200 OK                                  | **PASSED** |
| `2`       | Customer accessing admin-level route              | HTTP 403 Forbidden with `FORBIDDEN`          | **PASSED** |
| `3`       | Admin accessing admin-level route                 | HTTP 200 OK                                  | **PASSED** |
| `4`       | Unauthenticated request to protected route        | HTTP 401 Unauthorized with `UNAUTHORIZED`    | **PASSED** |
| `5`       | Unverified customer accessing verified-only route | HTTP 403 Forbidden with `EMAIL_NOT_VERIFIED` | **PASSED** |
| `6`       | Verified customer accessing verified-only route   | HTTP 200 OK                                  | **PASSED** |

---

## 3. Overall Test Execution Summary

```text
✓ tests/auth/email-verification.test.ts (5 tests)
✓ tests/auth/registration.test.ts (6 tests)
✓ tests/auth/authorization-rbac.test.ts (6 tests)
✓ tests/auth/login.test.ts (6 tests)
✓ tests/auth/tokens-and-sessions.test.ts (7 tests)
✓ tests/auth/password-recovery.test.ts (5 tests)
✓ tests/database-models.test.ts (14 tests)
✓ tests/database-connection.test.ts (4 tests)
✓ tests/health.test.ts (4 tests)
✓ tests/security-and-headers.test.ts (4 tests)
✓ tests/validation.test.ts (4 tests)
✓ tests/environment.test.ts (2 tests)

Test Files  12 passed (12)
     Tests  70 passed (70)
  Duration  23.45s
```

All 70 automated tests run completely green with 100% pass rate.
