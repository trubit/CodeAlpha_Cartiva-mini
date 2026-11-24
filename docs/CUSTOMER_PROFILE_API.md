# Cartiva Mini — Customer Profile & Account API Reference

This document provides complete technical specifications for the 19 REST API endpoints introduced in Phase 6 for Customer Profile, Address Management, Account Lifecycle, and Administrative Oversight.

All endpoints adhere to the Cartiva Mini standard response envelope:

```json
{
  "success": true,
  "message": "Human-readable status message",
  "data": { ... }
}
```

---

## 1. Customer Profile Endpoints

### 1.1 `GET /api/v1/users/me`

Retrieve the authenticated customer's complete profile and saved address count.

- **Authentication**: Required (`Bearer <JWT>`)
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "User profile retrieved successfully.",
  "data": {
    "id": "673c1a84f32a8e10c4391a01",
    "firstName": "Folake",
    "lastName": "Balogun",
    "email": "folake@example.com",
    "phone": "+2348011223344",
    "role": "customer",
    "isEmailVerified": true,
    "isActive": true,
    "avatarUrl": "https://res.cloudinary.com/cartiva/image/upload/v1234/avatar.webp",
    "pendingEmail": null,
    "deletionStatus": "none",
    "addressCount": 3,
    "createdAt": "2026-11-01T10:00:00.000Z",
    "updatedAt": "2026-11-03T12:00:00.000Z"
  }
}
```

---

### 1.2 `PATCH /api/v1/users/me`

Update the customer's personal profile information.

- **Authentication**: Required (`Bearer <JWT>`)
- **Request Body**:

```json
{
  "firstName": "Folake",
  "lastName": "Balogun-Johnson",
  "phone": "+2348099887766"
}
```

- **Validation**:
  - `firstName`: Optional, string, 2–50 characters.
  - `lastName`: Optional, string, 2–50 characters.
  - `phone`: Optional, string, valid E.164 phone format.
- **Response `200 OK`**: Returns updated `SafeUser` object.
- **Error `422 Unprocessable Entity`**: If phone format or name lengths are invalid.

---

### 1.3 `POST /api/v1/users/me/avatar`

Upload and update the customer's profile avatar.

- **Authentication**: Required (`Bearer <JWT>`)
- **Headers**: `Content-Type: multipart/form-data`
- **Body**: Form-data with field name `avatar` (max 2MB, JPEG, PNG, or WebP).
- **Security Check**: Binary magic-byte inspection verifies true image header.
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Avatar uploaded successfully.",
  "data": {
    "avatarUrl": "/uploads/avatars/avatar-673c1a84f32a8e10c4391a01-1730635200.webp"
  }
}
```

- **Error `400 Bad Request`**: If file missing, unsupported format, or invalid magic bytes.

---

### 1.4 `DELETE /api/v1/users/me/avatar`

Remove the customer's avatar and reset to default initials.

- **Authentication**: Required (`Bearer <JWT>`)
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Avatar removed successfully.",
  "data": null
}
```

---

## 2. Customer Address Book Endpoints

### 2.1 `GET /api/v1/users/me/addresses`

Retrieve all delivery addresses saved by the customer, sorted with default first.

- **Authentication**: Required (`Bearer <JWT>`)
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Addresses retrieved successfully.",
  "data": [
    {
      "id": "673c1b01f32a8e10c4391a02",
      "userId": "673c1a84f32a8e10c4391a01",
      "label": "Home",
      "recipientName": "Folake Balogun",
      "phone": "+2348011223344",
      "streetAddress": "15 Admiralty Way",
      "apartmentSuite": "Block B, Suite 4",
      "city": "Lekki",
      "state": "Lagos",
      "country": "Nigeria",
      "postalCode": "105102",
      "isDefault": true,
      "deliveryInstructions": "Call gate upon arrival",
      "createdAt": "2026-11-01T12:00:00.000Z",
      "updatedAt": "2026-11-01T12:00:00.000Z"
    }
  ]
}
```

---

### 2.2 `POST /api/v1/users/me/addresses`

Create a new delivery address.

- **Authentication**: Required (`Bearer <JWT>`)
- **Request Body**:

```json
{
  "label": "Office HQ",
  "recipientName": "Folake Balogun",
  "phone": "+2348011223344",
  "streetAddress": "44 Marina Street",
  "apartmentSuite": "Floor 7",
  "city": "Lagos Island",
  "state": "Lagos",
  "country": "Nigeria",
  "postalCode": "100221",
  "isDefault": false,
  "deliveryInstructions": "Drop off at reception"
}
```

- **Behavior**:
  - Enforces `MAX_USER_ADDRESSES = 10`.
  - If it is the first address, it is automatically marked default.
  - If `isDefault: true` is passed, other user addresses are atomically set to non-default.
- **Response `201 Created`**: Returns created address DTO.
- **Error `400 Bad Request`**: `MAX_ADDRESSES_REACHED` if user already has 10 addresses.

---

### 2.3 `GET /api/v1/users/me/addresses/:addressId`

Retrieve a single delivery address by ID.

- **Authentication**: Required (`Bearer <JWT>`)
- **IDOR Check**: Only returns the address if owned by the authenticated customer.
- **Response `200 OK`**: Returns address DTO.
- **Error `404 Not Found`**: `ADDRESS_NOT_FOUND`.

---

### 2.4 `PATCH /api/v1/users/me/addresses/:addressId`

Update an existing delivery address.

- **Authentication**: Required (`Bearer <JWT>`)
- **Request Body**: Any subset of `CreateAddressDto`.
- **Response `200 OK`**: Returns updated address DTO.

---

### 2.5 `DELETE /api/v1/users/me/addresses/:addressId`

Delete a delivery address.

- **Authentication**: Required (`Bearer <JWT>`)
- **Self-Healing**: If the deleted address was the default, the system automatically promotes the newest remaining address to default.
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Address deleted successfully.",
  "data": null
}
```

---

### 2.6 `PATCH /api/v1/users/me/addresses/:addressId/default`

Promote an address to be the customer's primary default shipping destination.

- **Authentication**: Required (`Bearer <JWT>`)
- **Response `200 OK`**: Returns address DTO with `isDefault: true`.

---

## 3. Email Change Workflow Endpoints

### 3.1 `POST /api/v1/users/me/email-change`

Request an email address change with 24h verification token.

- **Authentication**: Required (`Bearer <JWT>`)
- **Rate Limit**: Max 3 requests per hour.
- **Request Body**:

```json
{
  "newEmail": "folake.new@example.com"
}
```

- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Verification email dispatched. Please check your new mailbox to confirm.",
  "data": null
}
```

- **Error `400 Bad Request`**: `EMAIL_ALREADY_IN_USE` or same as current email.

---

### 3.2 `POST /api/v1/users/me/email-change/verify`

Verify the email change using the cryptographically secure token.

- **Authentication**: Public or Authenticated
- **Request Body**:

```json
{
  "token": "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"
}
```

- **Behavior**: Sets `email = pendingEmail`, clears token, increments `tokenVersion`, revokes active sessions.
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Email address updated successfully. Please log in with your new email.",
  "data": {
    "email": "folake.new@example.com"
  }
}
```

- **Error `400 Bad Request`**: `INVALID_TOKEN` if token has expired or is invalid.

---

### 3.3 `POST /api/v1/users/me/email-change/resend`

Resend verification token for the current pending email change.

- **Authentication**: Required (`Bearer <JWT>`)
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Verification email resent successfully.",
  "data": null
}
```

---

## 4. Account Lifecycle & Dashboard Endpoints

### 4.1 `POST /api/v1/users/me/deactivation-request`

Deactivate account immediately after password confirmation.

- **Authentication**: Required (`Bearer <JWT>`)
- **Request Body**:

```json
{
  "password": "Password123!",
  "reason": "Temporary break"
}
```

- **Behavior**: Sets `isActive: false`, logs deactivation reason, revokes all sessions.
- **Response `200 OK`**: Returns success confirmation.

---

### 4.2 `POST /api/v1/users/me/deletion-request`

Submit formal GDPR/CCPA account deletion request with 30-day grace period.

- **Authentication**: Required (`Bearer <JWT>`)
- **Request Body**:

```json
{
  "password": "Password123!",
  "reason": "Exercising Right to Erasure"
}
```

- **Response `200 OK`**: Returns deletion status DTO (`deletionStatus: "pending"`).

---

### 4.3 `GET /api/v1/users/me/deletion-request`

Check status of account deletion request.

- **Authentication**: Required (`Bearer <JWT>`)
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Deletion request status retrieved.",
  "data": {
    "deletionStatus": "pending",
    "deletionRequestedAt": "2026-11-03T12:00:00.000Z",
    "deletionReason": "Exercising Right to Erasure"
  }
}
```

---

### 4.4 `GET /api/v1/users/me/dashboard`

Aggregated customer dashboard statistics.

- **Authentication**: Required (`Bearer <JWT>`)
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Customer dashboard summary retrieved successfully.",
  "data": {
    "user": { ... },
    "totalOrders": 0,
    "recentOrders": [],
    "totalAddresses": 2,
    "hasDefaultAddress": true,
    "accountStatus": "active"
  }
}
```

---

## 5. Administrative Customer Management Endpoints

All admin endpoints require `Bearer <JWT>` with role `UserRole.ADMIN`.

### 5.1 `GET /api/v1/admin/users`

Paginated search and listing of all customer accounts.

- **Query Parameters**:
  - `page`: Integer (default 1).
  - `limit`: Integer (default 20, max 100).
  - `search`: String (searches `firstName`, `lastName`, `email`).
  - `role`: Filter by role (`customer`, `admin`).
  - `isActive`: Boolean string (`true`, `false`).
  - `deletionStatus`: String (`none`, `pending`, `processing`, `completed`).
- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Customer accounts retrieved successfully.",
  "data": {
    "users": [
      {
        "id": "673c1a84f32a8e10c4391a01",
        "firstName": "Folake",
        "lastName": "Balogun",
        "email": "folake@example.com",
        "role": "customer",
        "isActive": true,
        "isEmailVerified": true,
        "deletionStatus": "none",
        "createdAt": "2026-11-01T10:00:00.000Z",
        "lastLoginAt": "2026-11-03T11:45:00.000Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 20,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 5.2 `GET /api/v1/admin/users/:userId`

Detailed customer account view with all saved addresses.

- **Response `200 OK`**:

```json
{
  "success": true,
  "message": "Customer account details retrieved successfully.",
  "data": {
    "user": { ... },
    "addresses": [ ... ]
  }
}
```

---

### 5.3 `PATCH /api/v1/admin/users/:userId/status`

Suspend or activate customer account with tamper-evident audit logging.

- **Request Body**:

```json
{
  "isActive": false,
  "reason": "Suspected payment fraud detected during checkout"
}
```

- **Behavior**:
  - Prohibits admin self-suspension (`400 Bad Request`).
  - If `isActive: false`, immediately revokes all sessions and increments `tokenVersion`.
  - Creates immutable record in `AuditLog` collection.
- **Response `200 OK`**: Returns updated `SafeUser` object.
