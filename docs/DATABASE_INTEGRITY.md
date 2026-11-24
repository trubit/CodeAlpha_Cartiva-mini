# Cartiva Mini — Database Data Integrity, Transactions & Financial Strategy

**Document Version:** 1.0.0  
**Phase:** Phase 4: MongoDB Database Architecture & Data Management  
**Date:** November 2026  
**Status:** Approved & Implemented  
**Classification:** Database Architecture Deliverable

---

## 1. Overview & Data Integrity Philosophy

In a commercial e-commerce platform, data integrity failures lead directly to financial loss, stock discrepancies, and damaged customer trust. Because MongoDB is a non-relational database without declarative foreign key cascades, data integrity must be designed deliberately into schemas, indexes, atomic operators, and transactional boundaries.

Cartiva Mini establishes four pillars of data integrity:

1. **Strict Schema Constraints:** Rejection of malformed data at the Mongoose layer before it reaches the MongoDB wire protocol.
2. **Database-Level Unique Indexes:** Uncompromising defense against race conditions and duplicate entity creation.
3. **Atomic Operations & ACID Multi-Document Transactions:** Total consistency across multi-collection write sequences.
4. **Deterministic Financial Precision:** Elimination of IEEE 754 floating-point inaccuracies in currency calculations.

---

## 2. Financial Precision & Monetary Strategy

### 2.1 The Floating-Point Problem

Standard JavaScript IEEE 754 floating-point numbers cannot accurately represent decimal fractions (e.g., `0.1 + 0.2 === 0.30000000000000004`). In e-commerce, accumulating micro-rounding errors across thousands of items leads to balance mismatch in reconciliation.

### 2.2 Cartiva Mini Financial Policy

1. **Storage Currency Strategy:**
   - Primary operational currency: Nigerian Naira (`NGN`).
   - Prices, subtotals, shipping fees, discounts, and order totals are stored as clean decimal numbers rounded strictly to 2 decimal places (`Number.toFixed(2)` converted back via `Math.round(val * 100) / 100`) or integer minor units (kobo) for gateway payloads.
2. **Deterministic Order Formula:**
   ```
   totalAmount = (subtotal - discountAmount) + shippingFee + taxAmount
   ```
   Every order item contains an immutable snapshot of `unitPrice` and `totalPrice` at the exact millisecond of purchase.
3. **Double-Entry Transaction Ledger:**
   - Every financial debit or credit must produce an immutable `Transaction` document.
   - The ledger enforces the arithmetic identity:
     ```
     netAmount = amount - gatewayFee
     ```
   - Transaction records are strictly append-only; update and delete operations are prohibited.

---

## 3. Inventory Concurrency & Stock Protection Strategy

### 3.1 Preventing Overselling (Race Conditions)

When two customers simultaneously purchase the final unit of stock, naive read-then-write logic allows both orders to succeed, resulting in negative inventory.

Cartiva Mini enforces conditional atomic inventory decrements using MongoDB `$inc`:

```typescript
// Atomically deduct inventory ONLY if sufficient stock exists
const result = await Product.updateOne(
  {
    _id: productId,
    stockQuantity: { $gte: quantityToDeduct }, // Critical guard clause
    status: 'active',
  },
  {
    $inc: { stockQuantity: -quantityToDeduct },
  }
);

if (result.matchedCount === 0) {
  throw new InsufficientStockError('Requested quantity exceeds available inventory');
}
```

### 3.2 Immutable Stock Movement Audit Trail

Every modification to inventory (sale, restock, return, damaged write-off) must insert a corresponding document into `inventory_movements`:

- `quantity`: Signed integer (+ for restock/return, - for sales/damage).
- `previousStock`: Stock before the change.
- `newStock`: Stock after the change (`newStock === previousStock + quantity`).
- `referenceOrderId`: Required for sales and customer returns.

Schema-level validation rejects any movement record where `newStock !== previousStock + quantity` or where `quantity === 0`.

---

## 4. Multi-Document ACID Transactions

### 4.1 Deployment Requirements

MongoDB supports multi-document ACID transactions across collections and databases provided the deployment is running a **Replica Set** (standard in MongoDB Atlas or locally configured replica sets via `mongod --replSet rs0`). Standalone instances do not support multi-document transactions.

### 4.2 Critical Transactional Workflows

The following multi-collection business workflows must execute inside a Mongoose transaction session (`session.withTransaction()`):

#### Workflow A: Order Creation & Checkout

1. Start session & start transaction.
2. Validate coupon validity and atomically increment `coupons.usedCount`.
3. Atomically decrement `stockQuantity` on all order products using `$gte` guards.
4. Insert `inventory_movements` for all purchased items.
5. Insert the `orders` document with complete snapshots.
6. Delete or mark the customer's `carts` items as checked out.
7. Commit transaction. If any step fails or inventory is insufficient, abort transaction and roll back all changes.

#### Workflow B: Payment Verification & Settlement

1. Start session & start transaction.
2. Verify payment provider reference against gateway API.
3. Update `payments.status` to `'successful'`.
4. Insert immutable `transactions` ledger entry (`amount`, `gatewayFee`, `netAmount`).
5. Update `orders.paymentStatus` to `'paid'` and `orderStatus` to `'processing'`.
6. Insert customer `notifications` record.
7. Commit transaction.

#### Workflow C: Order Cancellation & Refund

1. Start session & start transaction.
2. Verify order is in a cancellable state (`pending` or `processing`).
3. Update `orders.orderStatus` to `'cancelled'` and `paymentStatus` to `'refunded'`.
4. If payment was captured, record a `'refund'` `transactions` entry.
5. Atomically increment `products.stockQuantity` for all returned items.
6. Insert corresponding `'return'` records in `inventory_movements`.
7. Commit transaction.

---

## 5. Idempotency & Duplicate Prevention

| Potential Hazard                    | Mitigation Mechanism                                                                                                                           |
| :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| **Duplicate Customer Registration** | Case-insensitive unique index on `users.email`.                                                                                                |
| **Duplicate Payment Processing**    | Unique index on `payments.paymentReference` and `payments.orderId`. Webhook handlers verify reference existence before recording transactions. |
| **Duplicate Order Placements**      | Unique index on `orders.orderNumber`. Client checkout requests must include a unique `checkoutSessionId` or idempotency token.                 |
| **Coupon Over-redemption**          | Unique index on `coupons.code`. Atomic check `{ code, usedCount: { $lt: usageLimit } }` with `$inc: { usedCount: 1 }`.                         |
| **Duplicate Product Reviews**       | Compound unique index on `reviews`: `{ productId: 1, userId: 1 }`.                                                                             |
| **Duplicate Wishlist Entries**      | Pre-save deduplication hook in `Wishlist.model.ts` guarantees set uniqueness on `items.productId`.                                             |

---

## 6. Audit & Compliance Integrity

Administrative and financial actions are captured in `audit_logs`:

- Logs are strictly **append-only**.
- Updates and deletions on the `audit_logs` collection are rejected.
- Changes record structured `changesDiff: { before, after }` capturing old and new values.
- Sensitive information (plaintext credentials, credit card details, API tokens) is strictly scrubbed before logging.
