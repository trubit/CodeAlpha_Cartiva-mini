# Cartiva Mini — Database Testing Strategy & Verification Report

**Document Version:** 1.0.0  
**Phase:** Phase 4: MongoDB Database Architecture & Data Management  
**Date:** November 2026  
**Status:** Approved & Implemented  
**Classification:** Database Architecture Deliverable

---

## 1. Testing Philosophy & Architecture

In Cartiva Mini, database verification adheres to strict enterprise standards:

1. **Zero Production Contamination:** Database integration tests never touch staging or production databases. Tests execute against isolated test databases (`cartiva-mini-conn-test`, `cartiva-mini-models-test`).
2. **Real Database Integration:** Tests execute against a live MongoDB daemon (or test cluster) to verify actual index generation, unique constraints, and schema validators. In-memory mocks are not used to make false claims about database capabilities.
3. **Automated Lifecycle Hooks:** Test suites drop test databases or clean collections between runs, ensuring zero cross-test state leakage.
4. **Strict Schema Failure Assertions:** Tests assert that invalid data (duplicate emails, negative stock, inverted sale prices, circular category hierarchies) is unequivocally rejected by Mongoose validators and MongoDB engine constraints.

---

## 2. Test Suites Overview

### 2.1 Connection Suite (`tests/database-connection.test.ts`)

Verifies the lifecycle, event listeners, and resilience of `connectDatabase()` and `disconnectDatabase()`:

- **Connection Lifecycle:** Connects to test URI, asserts `mongoose.connection.readyState === 1`.
- **Status Reporting:** Verifies `getDatabaseStatus()` reports `status: 'connected'` and `ready: true`.
- **HTTP Readiness Probe:** Executes supertest against `GET /health/ready`, asserting `HTTP 200` with database status details.
- **Graceful Disconnection:** Calls `disconnectDatabase()`, asserting `getDatabaseStatus()` reports `status: 'disconnected'` and `GET /health/ready` returns `HTTP 503`.

### 2.2 Model & Schema Validation Suite (`tests/database-models.test.ts`)

Comprises 17 automated integration test cases verifying all 16 collections:

| Collection                | Verified Capabilities & Constraints                                                                                                         | Test Outcome |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------ | :----------- |
| `users`                   | Creates valid user; enforces lowercase email; rejects duplicate emails via unique index; hides `passwordHash` by default (`select: false`). | **PASSED**   |
| `categories`              | Supports hierarchical category trees; rejects self-referencing category (`parentId === _id`).                                               | **PASSED**   |
| `products`                | Creates valid product; enforces unique uppercase SKU; validates `salePrice <= regularPrice`; masks `costPrice` from default projections.    | **PASSED**   |
| `carts`                   | Rejects cart without `userId` or `sessionId`; stores item subdocuments; automatically computes subtotal.                                    | **PASSED**   |
| `wishlists`               | Creates customer wishlist; enforces one wishlist per user; deduplicates repeated product additions.                                         | **PASSED**   |
| `orders`                  | Generates immutable order with snapshots for items and shipping address; validates financial totals.                                        | **PASSED**   |
| `payments`                | Creates payment record; enforces unique `paymentReference`; enforces 1:1 `orderId` uniqueness; stores sanitized gateway responses.          | **PASSED**   |
| `transactions`            | Records immutable double-entry ledger entry; verifies arithmetic invariant `netAmount = amount - gatewayFee`.                               | **PASSED**   |
| `reviews`                 | Validates rating between 1 and 5; enforces unique compound index `{ productId, userId }` (one review per user per product).                 | **PASSED**   |
| `coupons`                 | Enforces uppercase code; validates percentage discount `<= 100%`; enforces `expiryDate > startDate`.                                        | **PASSED**   |
| `addresses`               | Associates address with customer; validates phone format and required geographic fields.                                                    | **PASSED**   |
| `inventory_movements`     | Records immutable stock change; rejects zero quantity; validates math identity `newStock = previousStock + quantity`.                       | **PASSED**   |
| `notifications`           | Creates customer alert; verifies unread status; validates TTL index configuration (`expiresAt`).                                            | **PASSED**   |
| `support_tickets`         | Generates ticket with unique `ticketNumber`; stores message thread subdocuments with author roles.                                          | **PASSED**   |
| `audit_logs`              | Creates immutable audit record capturing actor, action, entity, IP, and before/after change diff.                                           | **PASSED**   |
| `shipping_configurations` | Configures geographic zone rates; validates delivery day bounds (`maxDays >= minDays`).                                                     | **PASSED**   |

---

## 3. Test Execution & Results

### 3.1 Commands to Run

```bash
# Execute entire test suite (Unit + Backend Integration + Database)
npm test

# Run only database-specific test suites
npx jest tests/database-connection.test.ts tests/database-models.test.ts --runInBand

# Run test suite in watch mode during development
npm run test:watch
```

### 3.2 Automated Test Execution Output

```
 PASS  tests/health.test.ts
 PASS  tests/shared-types.test.ts
 PASS  tests/server.test.ts
 PASS  tests/docs.test.ts
 PASS  tests/database-connection.test.ts
 PASS  tests/database-models.test.ts

Test Suites: 6 passed, 6 total
Tests:       35 passed, 35 total
Snapshots:   0 total
Time:        4.821 s
Ran all test suites.
```

All 35 tests passed across all 6 test suites with zero failures and zero skipped tests.
