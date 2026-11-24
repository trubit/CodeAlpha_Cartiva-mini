# Cartiva Mini — Customer Account & User Management Testing Strategy

## 1. Overview

Testing in Phase 6 verifies security controls, data integrity invariants, business rules, and error handling across customer profile management, address books, email change verification, account lifecycle transitions, and administrative oversight.

All test suites are written in **Vitest** with in-memory or localized MongoDB integration instances using the standard test harness (`tests/test-server.helper.ts`).

---

## 2. Test Suite Breakdown

### 2.1 Profile Management Suite (`tests/user/profile.test.ts`)

| Test Case                                        | Objective                                                    | Expected Result                                                           |
| :----------------------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------ |
| `should retrieve authenticated customer profile` | Customer requests `GET /users/me` with valid JWT             | Status 200, returns user profile, `addressCount: 0`, hides `passwordHash` |
| `should update customer profile information`     | Customer updates first name, last name, phone                | Status 200, database updated with sanitized values                        |
| `should reject invalid phone number format`      | Customer passes invalid phone string                         | Status 422 `VALIDATION_ERROR`, rejects payload                            |
| `should prevent role escalation and tampering`   | Customer attempts to send `role: 'admin'`, `isActive: false` | Role remains `customer`, administrative fields ignored                    |
| `should reject unauthenticated request with 401` | Call without Authorization header                            | Status 401 `UNAUTHORIZED`                                                 |

---

### 2.2 Address Book Suite (`tests/user/address.test.ts`)

| Test Case                                         | Objective                                                     | Expected Result                                                                  |
| :------------------------------------------------ | :------------------------------------------------------------ | :------------------------------------------------------------------------------- |
| `should auto-set first address as default`        | Customer creates their first address                          | Status 201, `isDefault: true` automatically assigned                             |
| `should maintain single default address`          | Customer sets address #2 as default                           | Status 200, address #2 is default, address #1 automatically unset to non-default |
| `should prevent IDOR`                             | Attacker attempts to read, update, or delete victim's address | Status 404 `ADDRESS_NOT_FOUND`, victim address remains unchanged                 |
| `should promote next address on default deletion` | Customer deletes default address                              | Status 200, newest remaining address promoted to `isDefault: true`               |
| `should enforce 10 addresses limit`               | Customer attempts to add an 11th address                      | Status 400 `MAX_ADDRESSES_REACHED`                                               |

---

### 2.3 Email Change Workflow Suite (`tests/user/email-change.test.ts`)

| Test Case                                            | Objective                                                | Expected Result                                                                         |
| :--------------------------------------------------- | :------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| `should initiate email change & keep active email`   | Customer requests change to new email                    | Status 200, `pendingEmail` and SHA-256 token stored, current email remains active       |
| `should reject change to same email`                 | Customer enters their existing email                     | Status 400 Bad Request                                                                  |
| `should reject registered email`                     | Customer enters an email already used by another account | Status 400 `EMAIL_ALREADY_IN_USE`                                                       |
| `should verify token, update email, revoke sessions` | Customer submits valid 24h verification token            | Status 200, `email` updated to `newEmail`, `tokenVersion` incremented, sessions revoked |
| `should reject expired verification token`           | Verification token timestamp > 24 hours ago              | Status 400 `INVALID_TOKEN`                                                              |

---

### 2.4 Account Lifecycle & Dashboard Suite (`tests/user/account-lifecycle.test.ts`)

| Test Case                                                  | Objective                                         | Expected Result                                                                                          |
| :--------------------------------------------------------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------------- |
| `should deactivate account with valid password`            | Customer submits deactivation with valid password | Status 200, `isActive: false`, sessions revoked, subsequent requests blocked with 403 `ACCOUNT_INACTIVE` |
| `should reject deactivation with incorrect password`       | Customer provides wrong password                  | Status 401 `INVALID_CREDENTIALS`, account remains active                                                 |
| `should submit account deletion request and return status` | Customer requests deletion under GDPR             | Status 200, `deletionStatus: 'pending'`, deletion reason recorded                                        |
| `should retrieve customer dashboard summary statistics`    | Customer queries `GET /users/me/dashboard`        | Status 200, returns aggregated profile, order count, and address statistics                              |

---

### 2.5 Admin Customer Management Suite (`tests/user/admin-management.test.ts`)

| Test Case                                                   | Objective                                          | Expected Result                                                               |
| :---------------------------------------------------------- | :------------------------------------------------- | :---------------------------------------------------------------------------- |
| `should reject unauthenticated request with 401`            | Anonymous caller accesses `/api/v1/admin/users`    | Status 401 `UNAUTHORIZED`                                                     |
| `should reject non-admin customer with 403`                 | Customer accesses `/api/v1/admin/users`            | Status 403 `FORBIDDEN`                                                        |
| `should list and search customer accounts`                  | Admin searches by query and filters by status      | Status 200, paginated response matching search criteria                       |
| `should view customer detail and addresses`                 | Admin inspects specific customer account           | Status 200, returns customer object with complete address array               |
| `should suspend account, revoke sessions, record audit log` | Admin patches customer status to `isActive: false` | Status 200, customer inactive, sessions cleared, record written to `AuditLog` |
| `should prevent admin self-suspension`                      | Admin attempts to deactivate their own account     | Status 400 Bad Request                                                        |

---

## 3. Running Test Suites

Execute all customer account and platform integration tests:

```bash
# Run complete test suite across all modules
npm test

# Run only Phase 6 user domain tests
npm test tests/user/
```
