# CARTIVA MINI — AUTHENTICATION API SPECIFICATION

## 1. Global API Standards

- **Base Path:** `/api/v1/auth`
- **Protocol:** HTTPS (in production), HTTP (local development)
- **Data Exchange Format:** `application/json`
- **Authentication Headers:**
  - Access Token: `Authorization: Bearer <accessToken>`
  - Refresh Token: Delivered via `HttpOnly` cookie named `cartiva_refresh_token`

### Standard Success Response Envelope

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": { ... },
  "timestamp": "2026-11-03T11:00:00.000Z",
  "requestId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

### Standard Error Response Envelope

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password.",
    "details": []
  },
  "timestamp": "2026-11-03T11:00:00.000Z",
  "requestId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

---

## 2. Implemented Endpoints Reference

### 2.1 Customer Registration

- **Method / Path:** `POST /api/v1/auth/register`
- **Auth Required:** No (Public)
- **Rate Limit:** 5 requests per 15 minutes per IP
- **Request Body:**
  ```json
  {
    "firstName": "Folake",
    "lastName": "Adeyemi",
    "email": "folake@example.com",
    "password": "SecurePassword123!",
    "confirmPassword": "SecurePassword123!",
    "acceptTerms": true
  }
  ```
- **Responses:**
  - `201 Created`: Customer registered. Verification email dispatched. Returns `SafeUser` representation.
  - `400 Bad Request`: Validation failure (weak password, missing terms, mismatched passwords).
  - `409 Conflict`: `USER_ALREADY_EXISTS` (Email already registered).

---

### 2.2 Customer Login

- **Method / Path:** `POST /api/v1/auth/login`
- **Auth Required:** No (Public)
- **Rate Limit:** 10 requests per 15 minutes per IP
- **Request Body:**
  ```json
  {
    "email": "folake@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Responses:**
  - `200 OK`: Sets `cartiva_refresh_token` in `HttpOnly` cookie.
    ```json
    {
      "success": true,
      "message": "Login successful.",
      "data": {
        "user": {
          "id": "60d0fe4f5311236168a109ca",
          "firstName": "Folake",
          "lastName": "Adeyemi",
          "email": "folake@example.com",
          "role": "customer",
          "isEmailVerified": true,
          "status": "active"
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIs..."
      }
    }
    ```
  - `401 Unauthorized`: `INVALID_CREDENTIALS` (Invalid email or password).
  - `401 Unauthorized`: `EMAIL_NOT_VERIFIED` (Account must be verified before login).
  - `401 Unauthorized`: `ACCOUNT_LOCKED` (Temporary 30m lock after 5 failed attempts).
  - `403 Forbidden`: `ACCOUNT_INACTIVE` (Account suspended or disabled).

---

### 2.3 Session Refresh & Token Rotation

- **Method / Path:** `POST /api/v1/auth/refresh`
- **Auth Required:** No (Uses `cartiva_refresh_token` cookie)
- **Request Body:** None
- **Responses:**
  - `200 OK`: Rotates refresh token, resets cookie with new token, and returns newly signed `accessToken`.
  - `401 Unauthorized`: `INVALID_TOKEN` (Missing, expired, or replayed refresh token).

---

### 2.4 Logout (Current Session)

- **Method / Path:** `POST /api/v1/auth/logout`
- **Auth Required:** No (Uses `cartiva_refresh_token` cookie or Bearer token)
- **Request Body:** None
- **Responses:**
  - `200 OK`: Invalidates the server-side session and clears `cartiva_refresh_token` cookie.

---

### 2.5 Logout All Sessions

- **Method / Path:** `POST /api/v1/auth/logout-all`
- **Auth Required:** Yes (`Authorization: Bearer <accessToken>`)
- **Request Body:** None
- **Responses:**
  - `200 OK`: Marks all sessions for the authenticated user as revoked, increments `tokenVersion`, and clears current cookie.

---

### 2.6 Authenticated User Profile (`/me`)

- **Method / Path:** `GET /api/v1/auth/me`
- **Auth Required:** Yes (`Authorization: Bearer <accessToken>`)
- **Responses:**
  - `200 OK`: Returns current authenticated `SafeUser`.
  - `401 Unauthorized`: Missing or invalid Bearer token.

---

### 2.7 Email Verification

- **Method / Path:** `POST /api/v1/auth/verify-email`
- **Auth Required:** No (Public)
- **Rate Limit:** 10 requests per 15 minutes per IP
- **Request Body:**
  ```json
  {
    "token": "7a3e9c5f...64-char-hex-token"
  }
  ```
- **Responses:**
  - `200 OK`: Marks email as verified. Account status activated.
  - `400 Bad Request`: `INVALID_TOKEN` (Invalid or expired token).

---

### 2.8 Resend Email Verification

- **Method / Path:** `POST /api/v1/auth/resend-verification`
- **Auth Required:** No (Public)
- **Rate Limit:** 10 requests per 15 minutes per IP
- **Request Body:**
  ```json
  {
    "email": "folake@example.com"
  }
  ```
- **Responses:**
  - `200 OK`: Returns generic confirmation message (protects against account enumeration).

---

### 2.9 Forgot Password (Recovery Request)

- **Method / Path:** `POST /api/v1/auth/forgot-password`
- **Auth Required:** No (Public)
- **Rate Limit:** 5 requests per 15 minutes per IP
- **Request Body:**
  ```json
  {
    "email": "folake@example.com"
  }
  ```
- **Responses:**
  - `200 OK`: Dispatches 1-hour reset token if account exists; returns generic confirmation message.

---

### 2.10 Reset Password

- **Method / Path:** `POST /api/v1/auth/reset-password`
- **Auth Required:** No (Public)
- **Rate Limit:** 5 requests per 15 minutes per IP
- **Request Body:**
  ```json
  {
    "token": "3b8d1f0e...64-char-hex-token",
    "password": "NewSecurePassword456!",
    "confirmPassword": "NewSecurePassword456!"
  }
  ```
- **Responses:**
  - `200 OK`: Hashes new password, invalidates all existing sessions, clears reset tokens.
  - `400 Bad Request`: `INVALID_TOKEN` or validation mismatch.

---

### 2.11 Change Password (Authenticated)

- **Method / Path:** `POST /api/v1/auth/change-password`
- **Auth Required:** Yes (`Authorization: Bearer <accessToken>`)
- **Request Body:**
  ```json
  {
    "currentPassword": "SecurePassword123!",
    "newPassword": "NewSecurePassword456!",
    "confirmPassword": "NewSecurePassword456!"
  }
  ```
- **Responses:**
  - `200 OK`: Verifies `currentPassword`, saves hashed `newPassword`, revokes all other sessions, dispatches security email.
  - `401 Unauthorized`: `INVALID_CREDENTIALS` (Current password does not match).

---

### 2.12 List User Active Sessions

- **Method / Path:** `GET /api/v1/auth/sessions`
- **Auth Required:** Yes (`Authorization: Bearer <accessToken>`)
- **Responses:**
  - `200 OK`: Returns list of non-revoked sessions belonging to the user (`sessionId`, `userAgent`, `ipAddress`, `lastActiveAt`, `isCurrent`).

---

### 2.13 Revoke Individual Session

- **Method / Path:** `DELETE /api/v1/auth/sessions/:sessionId`
- **Auth Required:** Yes (`Authorization: Bearer <accessToken>`)
- **Responses:**
  - `200 OK`: Marks specific session as revoked.
  - `404 Not Found`: Session not found or does not belong to the user.
