# Cartiva Mini — Admin Audit Logs & Security Trails

## 1. Overview
The administrative audit log is an append-only, immutable security record documenting all privileged operations executed within the Cartiva Mini ecosystem.

## 2. Tracked Events & Data Structure
Every sensitive administrative action generates an `AuditLog` entry containing:
- **`actor` / `userId`**: The user ID and email of the administrator or staff member.
- **`action`**: Verb describing the event (e.g., `STAFF_CREATED`, `ROLE_UPDATED`, `STOCK_ADJUSTED`, `SETTINGS_UPDATED`, `REVIEW_MODERATED`, `COUPON_CREATED`).
- **`resource`**: The affected entity type (`User`, `Product`, `Inventory`, `SupportTicket`, `PlatformSettings`, `Coupon`, `Review`).
- **`resourceId`**: Unique identifier or business reference of the target resource.
- **`metadata`**: Action context, state diff, before/after values, and justification reasons.
- **`ipAddress` & `userAgent`**: Source network metadata captured for forensic attribution.
- **`timestamp`**: UTC timestamp of event execution.

## 3. Immutability & Security Controls
- **No Mutation or Deletion:** The audit log collection does not expose `update`, `patch`, or `delete` endpoints. Records are write-once and permanent.
- **Role Gating:** Access to view audit logs is strictly limited to users with `UserRole.ADMIN`. Staff members and customers cannot view or query audit records.
- **Zero Sensitive Data:** Passwords, payment card PANs, authorization tokens, and API secret keys are scrubbed prior to metadata serialization.

## 4. Endpoints
- `GET /api/v1/admin/audit-logs`: Paginated search with filtering by actor, action, resource, and date range.
