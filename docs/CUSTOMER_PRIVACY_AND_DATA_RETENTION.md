# Cartiva Mini — Customer Privacy & Data Retention Policy

## 1. Regulatory Context

Cartiva Mini is designed in compliance with modern data privacy frameworks, specifically:

- **NDPR** (Nigeria Data Protection Regulation) / **NDPA** (Nigeria Data Protection Act 2023)
- **GDPR** (General Data Protection Regulation — EU/UK)
- **CCPA/CPRA** (California Consumer Privacy Act)

E-commerce operations process sensitive personal identifiers (PII) alongside legally binding financial records. This document establishes the boundaries between privacy rights (Right to Erasure) and statutory financial compliance (data retention mandates).

---

## 2. Account Deactivation vs. Account Deletion

| Dimension          | Account Deactivation                                           | Account Deletion (Right to Erasure)                           |
| :----------------- | :------------------------------------------------------------- | :------------------------------------------------------------ |
| **Trigger**        | Immediate self-service (`POST /users/me/deactivation-request`) | Customer request (`POST /users/me/deletion-request`)          |
| **Authentication** | Password verification required                                 | Password verification required                                |
| **Session Impact** | Instant session termination & token invalidation               | Instant session termination & token invalidation              |
| **Account State**  | `isActive: false`                                              | `deletionStatus: 'pending'`                                   |
| **Grace Period**   | Indefinite; customer may contact support to reactivate         | 30-day grace period before physical pseudonymization          |
| **Data Retention** | Data remains intact in dark state                              | PII scrubbed after grace period; financial records anonymized |
| **Order History**  | Visible upon reactivation                                      | Decoupled and anonymized                                      |

---

## 3. Financial Records vs. PII Retention

A frequent legal conflict in e-commerce engineering occurs between privacy erasure requests and statutory financial obligations:

- **Tax & Audit Requirements**: Corporate tax regulations in Nigeria (FIRS), the UK (HMRC), and the US (IRS) mandate retaining financial audit trails and invoices for 6 to 7 years.
- **Chargeback & Fraud Protection**: Payment processors (Paystack, Stripe) require transaction dispute defense records for up to 180 days.

### 3.1 The Cartiva Mini Anonymization Pattern

To fulfill both obligations simultaneously:

1. When account deletion is finalized after the 30-day grace period:
   - `User.email` is replaced with `deleted-<userId>@anonymized.cartiva.internal`.
   - `User.firstName`, `lastName`, and `phone` are scrubbed and replaced with `[REDACTED]`.
   - `User.avatarUrl` is physically deleted from storage.
   - `Address` records for the user are permanently deleted.
   - All active `Session` documents are purged.
2. `Order` records are retained for financial reconciliation, but customer personal references within the order snapshots are redacted while financial totals, VAT/tax lines, and product SKU references remain intact for accounting ledger accuracy.

---

## 4. Deletion Request Lifecycle

```
[Customer Submits Deletion Request]
                 │
                 ▼
      [Password Verified]
                 │
                 ▼
1. User.deletionStatus = 'pending'
2. User.deletionRequestedAt = Date.now()
3. User.deletionReason = reason
4. user.tokenVersion++ (invalidates access tokens)
5. Session.updateMany({ userId }, { isRevoked: true })
6. Confirmation email dispatched to user's registered address
                 │
                 ▼
      [30-Day Grace Period]
  (User can contact support to cancel)
                 │
                 ▼
[Automated Deletion Worker / Admin Execution]
                 │
                 ▼
1. User.deletionStatus = 'completed'
2. PII Fields Anonymized & Addresses Deleted
3. Avatar Image Purged from Disk / CDN
4. AuditLog recorded with ACTION: 'USER_DELETION_COMPLETED'
```

---

## 5. Customer Data Portability & Rights

Under GDPR Article 20 and NDPR Section 3.1, customers have the right to receive their personal data in a structured, commonly used format:

- The customer profile endpoint (`GET /api/v1/users/me`) and address book endpoint (`GET /api/v1/users/me/addresses`) return standardized JSON.
- The customer dashboard endpoint (`GET /api/v1/users/me/dashboard`) provides a single-call consolidated view of the customer's current state, recent orders, and account status.
