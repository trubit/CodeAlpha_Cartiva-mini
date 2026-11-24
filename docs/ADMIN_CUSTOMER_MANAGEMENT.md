# Cartiva Mini — Admin Customer Management

## 1. Overview
The customer management interface allows authorized administrators to inspect customer accounts, evaluate purchasing patterns, verify registration timelines, and enforce account suspensions or review customer account deletion requests.

## 2. Security & Privacy Guarantees
- **Credential Protection:** Password hashes, salt rounds, MFA secrets, and refresh token signatures are strictly excluded from all customer API projections via Mongoose select exclusions (`-passwordHash -refreshTokenHash`).
- **Data Retention & Historical Preservation:** When an account is suspended or deletion is reviewed, historical orders, verified payments, and financial ledgers remain immutable for regulatory tax and audit compliance.
- **Audit Logging:** Every customer suspension, restoration, or deletion status review logs an immutable audit event referencing the actor's user ID, IP address, and target customer reference.

## 3. Endpoints & Operations
- `GET /api/v1/admin/users`: Paginated search and retrieval of registered platform users with status filtering (`isActive`, `role`).
- `GET /api/v1/admin/users/:userId`: Detailed user profile, verified phone, registration date, and order history summary.
- `PATCH /api/v1/admin/users/:userId/status`: Account activation or suspension toggle with administrative reason recording.
- `PATCH /api/v1/admin/users/:userId/deletion-request`: Administrative review and approval/rejection of GDPR/NDPR deletion requests.
