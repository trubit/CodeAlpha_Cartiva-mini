# Cartiva Mini — Customer Account Architecture

## 1. Executive Overview

Customer Account and Profile Management in **Cartiva Mini** (Phase 6) provides the foundational identity, address book, security boundary, and profile management capabilities required for a commercial e-commerce enterprise.

The architecture is built with defense-in-depth principles:

- **Zero-Trust Identity**: Every profile and address mutation enforces authenticated user context derived from validated JWT claims (`req.user.userId`).
- **Strict Parameter Whitelisting**: Role escalation and privilege tampering are mitigated at the validation layer; customer inputs cannot alter `role`, `isActive`, `isEmailVerified`, or administrative status flags.
- **Single Default Address Invariant**: MongoDB atomic updates guarantee that each customer has at most one active primary delivery address at any moment in time.
- **Two-Step Secure Email Change Protocol**: Email updates require verification via cryptographically secure SHA-256 tokens, preserving the existing verified email until the new mailbox confirms ownership.
- **Resilient Media Storage**: Avatar upload pipeline verifies file signatures using binary magic-byte inspection (JPEG, PNG, WebP) and supports both local filesystem storage and high-availability cloud object storage (Cloudinary) with automatic fallback.

---

## 2. Customer Profile Data Model

Customer identity is centered on the `User` schema in `backend/src/models/User.model.ts`:

```typescript
export interface IUser {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  avatarUrl?: string;
  pendingEmail?: string;
  emailChangeToken?: string;
  emailChangeExpires?: Date;
  deactivationReason?: string;
  deletionRequestedAt?: Date;
  deletionReason?: string;
  deletionStatus: 'none' | 'pending' | 'processing' | 'completed';
  tokenVersion: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.1 Security & Projection Guardrails

- `passwordHash`, `emailChangeToken`, `emailChangeExpires`, and `passwordResetToken` are configured with `{ select: false }`.
- The Mongoose `toJSON` transform automatically deletes internal sensitive fields before returning responses to the caller:
  - `passwordHash`
  - `emailChangeToken`
  - `emailChangeExpires`
  - `passwordResetToken`
  - `passwordResetExpires`
  - `emailVerificationToken`
  - `emailVerificationExpires`
  - `__v`

---

## 3. Address Book Architecture

The Address Management subsystem allows customers to save up to 10 distinct shipping and delivery destinations (`backend/src/models/Address.model.ts`).

### 3.1 Schema & Data Integrity

- **Indexed Relational Boundary**: Each address document references `userId: Types.ObjectId` with a compound index `{ userId: 1, isDefaultShipping: -1 }` for rapid lookup and sorted pagination.
- **Enforced Address Limit**: A hard limit of `MAX_USER_ADDRESSES = 10` is enforced at the service layer prior to document creation to prevent database bloat and resource exhaustion attacks.
- **Atomic Single-Default Invariant**:
  1. When a customer adds their very first address, it is automatically marked as `isDefaultShipping: true`.
  2. When an address is marked as default (or created as default), `Address.updateMany({ userId }, { isDefaultShipping: false })` executes atomically before setting the target address to `true`.
  3. If a customer deletes their default address, the system automatically selects the newest remaining address and promotes it to default, preventing orphaned states.
- **IDOR Protection**: All mutations (`GET /:id`, `PATCH /:id`, `DELETE /:id`, `PATCH /:id/default`) require matching `{ _id: addressId, userId }`. An attacker attempting to view or modify an address belonging to another user receives a `404 Not Found` (never leaking whether the ID exists).

---

## 4. Secure Email Change Protocol

Directly changing an account's email without verification is a critical security vulnerability that enables account takeover (ATO). Cartiva Mini enforces a dual-step confirmation protocol:

```
[Customer Request]
       │
       ▼
1. Validate new email uniqueness in DB
2. Generate 32-byte crypto random token
3. Compute SHA-256 hash -> Store in user.emailChangeToken (24h expiry)
4. Store requested address in user.pendingEmail
5. Keep current user.email active (account remains accessible)
6. Dispatch verification email to NEW address
7. Dispatch security alert to CURRENT address
       │
       ▼
[Customer clicks link with raw token]
       │
       ▼
1. Hash input token with SHA-256
2. Match against user.emailChangeToken where expiry > Date.now()
3. Check target email uniqueness once more (prevent race condition)
4. Update user.email = user.pendingEmail
5. Clear user.pendingEmail, emailChangeToken, emailChangeExpires
6. Increment user.tokenVersion (invalidates all existing access tokens)
7. Revoke all active sessions in Session collection (forces re-login)
8. Dispatch confirmation notification to both mailboxes
```

---

## 5. Avatar Media Processing & Storage Pipeline

The avatar subsystem handles user profile images (`POST /api/v1/users/me/avatar`):

1. **Size Limit**: 2MB hard limit enforced by `multer.memoryStorage()`.
2. **Binary Magic-Byte Inspection**:
   MIME sniffing by file extension is rejected. The service inspects the raw binary buffer:
   - `JPEG`: Starts with `FF D8 FF`
   - `PNG`: Starts with `89 50 4E 47 0D 0A 1A 0A`
   - `WebP`: Starts with `52 49 46 46` (RIFF) and contains `57 45 42 50` (WEBP) at byte offset 8
3. **Storage Boundary**:
   - **Cloud Storage (Cloudinary REST API)**: Direct REST upload using Node native `fetch` and `FormData` (avoiding fragile third-party SDK dependencies).
   - **Local Storage Fallback**: When cloud credentials are not supplied, files are safely written to `uploads/avatars/` with cryptographically random UUID filenames.
4. **Cleanup & Pruning**:
   When a user uploads a new avatar or deletes their avatar (`DELETE /api/v1/users/me/avatar`), any existing local or remote avatar file is permanently removed to prevent unreferenced orphan files.

---

## 6. Account Lifecycle State Machine

```
              ┌───────────────┐
              │    ACTIVE     │ ◄─── (Normal Customer State)
              └───────┬───────┘
                      │
         ┌────────────┴────────────┐
         │ (Customer Self-Service) │ (Customer Request)
         ▼                         ▼
┌──────────────────┐      ┌─────────────────────────┐
│   DEACTIVATED    │      │    DELETION PENDING     │ (30-day grace period)
│ (Immediate lock, │      │ (Retains order history, │
│  sessions killed)│      │  anonymizes profile)    │
└────────┬─────────┘      └────────────┬────────────┘
         │                             │ (Admin/Scheduled Worker)
         │ (Admin Suspension)          ▼
         ▼                        ┌─────────────────────────┐
┌──────────────────┐              │   ANONYMIZED / ERASED   │
│  ADMIN SUSPENDED │              │ (PII replaced with      │
│ (Recorded in     │              │  redacted tokens)       │
│  AuditLog)       │              └─────────────────────────┘
└──────────────────┘
```

### 6.1 Session Revocation

Any state transition from `ACTIVE` to `DEACTIVATED`, `DELETION PENDING`, or `ADMIN SUSPENDED` triggers:

1. `user.tokenVersion++`: Instantly invalidates all in-flight short-lived JWT access tokens.
2. `Session.updateMany({ userId }, { isRevoked: true })`: Invalidates all refresh tokens and sessions.
3. Inactive accounts attempting authentication receive `403 Forbidden` (`ACCOUNT_INACTIVE`).

---

## 7. Administrative Oversight & Audit Trails

Administrators have access to `/api/v1/admin/users`:

- **Search & Filter**: Full text search across `firstName`, `lastName`, and `email`, plus role and status filtering with paginated output.
- **Detailed Inspection**: View complete customer details and all associated shipping addresses.
- **Status Mutation**: Ability to suspend or reactivate customer accounts.
- **Self-Lockout Prevention**: System prohibits an administrator from suspending their own account (`400 Bad Request`).
- **Tamper-Evident Audit Logging**: Every administrative status change is logged in the `AuditLog` collection with actor ID, IP address, user-agent, timestamp, and diff of changes.
