# CARTIVA MINI — AUTHORIZATION & ROLE-BASED ACCESS CONTROL (RBAC)

## 1. Authorization Philosophy

Cartiva Mini enforces a strict **Deny-by-Default** authorization model. All API routes require authenticated credentials unless explicitly marked public (e.g., health probes, catalog browsing, registration, login).

Authorization is validated exclusively on the server side. Frontend navigation guards serve purely as user-experience conveniences and are never trusted as security boundaries.

---

## 2. Supported Roles & Hierarchy

Role identifiers are centralized in `shared/types/enums.ts` via the `UserRole` enum:

```typescript
export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
}
```

### 2.1 Role Capabilities Matrix

| Capability / Resource Domain           | Public / Guest |      Customer       |        Admin        |
| -------------------------------------- | :------------: | :-----------------: | :-----------------: |
| Browse Products & Categories           |      Yes       |         Yes         |         Yes         |
| Health & API Metrics                   |      Yes       |         Yes         |         Yes         |
| Account Registration & Login           |      Yes       | No (Already Authed) | No (Already Authed) |
| Manage Personal Profile & Password     |       No       |   Yes (Self only)   |   Yes (Self only)   |
| Manage Personal Sessions               |       No       |   Yes (Self only)   |   Yes (Self only)   |
| View / Manage Personal Cart & Wishlist |       No       |   Yes (Self only)   |   Yes (Self only)   |
| Create & View Personal Orders          |       No       |   Yes (Self only)   |   Yes (Self only)   |
| Product Catalogue Management (CRUD)    |       No       |    No (HTTP 403)    |         Yes         |
| User Account Administration & Status   |       No       |    No (HTTP 403)    |         Yes         |
| Inventory & Coupon Management          |       No       |    No (HTTP 403)    |         Yes         |
| View Platform Audit Logs & Analytics   |       No       |    No (HTTP 403)    |         Yes         |

---

## 3. Server-Side Authorization Middleware Pipeline

Authorization is enforced using decoupled, composable Express middleware located in `backend/src/middleware/auth.middleware.ts`:

### 3.1 `authenticate` Middleware

- Extracts the Bearer token from the `Authorization: Bearer <token>` header.
- Verifies token signature and expiration against `JWT_ACCESS_SECRET`.
- Queries the database to confirm user existence and active status.
- Rejects requests if user status is `SUSPENDED` or `INACTIVE` (HTTP 403 `ACCOUNT_INACTIVE`).
- Attaches the sanitized security context to `req.user`:
  ```typescript
  req.user = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    status: user.status,
  };
  ```

### 3.2 `requireRole(...allowedRoles: UserRole[])` Middleware

- Executes after `authenticate`.
- Verifies that `req.user.role` is present in the `allowedRoles` list.
- If the user role does not match, returns HTTP 403 Forbidden:
  ```json
  {
    "success": false,
    "error": {
      "code": "FORBIDDEN",
      "message": "Forbidden. You do not have permission to access this resource."
    }
  }
  ```

### 3.3 `requireEmailVerified` Middleware

- Rejects unverified accounts from performing sensitive commercial operations (such as checkout or placing reviews) with HTTP 403 Forbidden (`EMAIL_NOT_VERIFIED`).

### 3.4 `optionalAuthenticate` Middleware

- Inspects the `Authorization` header. If a valid token is provided, `req.user` is populated. If absent or expired, the request proceeds as a guest without throwing an error (used for public catalog pages with personalized wishlist highlights).

---

## 4. Preventing Role Escalation & Mass Assignment

1. **Zero Public Administrator Creation:** The public registration endpoint (`POST /api/v1/auth/register`) strictly sets `role: UserRole.CUSTOMER`.
2. **Schema Sanitization:** The Zod `registerSchema` only allows `firstName`, `lastName`, `email`, `password`, `confirmPassword`, and `acceptTerms`. Any incoming `role` or `isAdmin` field is stripped during validation.
3. **Immutable Identity in Access Tokens:** The access token encodes the user's role at time of issuance. If an administrator alters a user's role or suspends an account, the user's database status is checked during route traversal, and token versioning guarantees rapid privilege revocation.

---

## 5. Insecure Direct Object Reference (IDOR) Mitigation

Role checks alone are insufficient for protecting customer data. Cartiva Mini enforces **Resource Ownership Verification** across all domain routes:

```typescript
// Pattern: Resource Ownership Guard
const resource = await Order.findById(req.params.id);
if (!resource) {
  throw new AppError(HttpStatus.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND, 'Order not found');
}

// Allow access if caller is an Admin OR the resource owner
const isOwner = resource.userId.toString() === req.user.userId;
const isAdmin = req.user.role === UserRole.ADMIN;

if (!isOwner && !isAdmin) {
  throw new AppError(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, 'Access denied to this resource');
}
```

This pattern is verified in automated tests for session management (`DELETE /api/v1/auth/sessions/:sessionId`), where customers are blocked from revoking sessions belonging to other accounts.
