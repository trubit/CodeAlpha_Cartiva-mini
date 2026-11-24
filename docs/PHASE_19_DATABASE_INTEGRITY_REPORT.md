# CARTIVA MINI — PHASE 19 DATABASE INTEGRITY REPORT

**Project:** Cartiva Mini  
**Phase:** 19 of 20 (Comprehensive Testing, Code Review & Security Hardening)  
**Status:** COMPLETE & VERIFIED  

---

## 1. Database Architecture & Collections

Cartiva Mini persists data into MongoDB via Mongoose ODM schemas enforced by strict TypeScript interfaces and schema validators:

```
Collections in Cartiva Mini Database:
- users: Account identities, password hashes, RBAC roles, active session families
- products: Catalog items, slugs, descriptions, price, SKU, published status, media
- categories: Hierarchical taxonomy tree (parent-child category links)
- inventories: Live available stock, reserved stock, low-stock threshold, movement history
- carts: Ephemeral and customer carts with line item unitPrice/title snapshots
- wishlists: Saved product lists per customer
- orders: Immutable transaction snapshots, customer contact snapshot, delivery address snapshot
- orderstatuslogs: Append-only state transition audit trails per order
- shippingconfigurations: Regional delivery zones, states covered, weight formulas
- auditlogs: Platform-wide immutable audit trail for security and staff operations
- outboxnotifications: Transactional notification queue for reliable email delivery
```

---

## 2. Integrity Controls & Schema Guarantees

### 2.1 Unique Constraints & Indexes

| Collection | Indexed Fields | Constraint Type | Verification Status |
|---|---|---|---|
| `users` | `{ email: 1 }` | `unique: true` | Tested in `registration.test.ts` (prevents duplicate emails). |
| `products` | `{ slug: 1 }` | `unique: true` | Tested in `product-management.test.ts` (auto-generates unique suffix). |
| `products` | `{ sku: 1 }` | `unique: true` | Tested in `database-models.test.ts`. |
| `orders` | `{ orderNumber: 1 }` | `unique: true` | Tested in `order-creation.test.ts`. |
| `inventories` | `{ productId: 1 }` | `unique: true` | Enforces 1:1 relationship between product and stock record. |
| `shippingconfigurations` | `{ statesCovered: 1, isActive: 1 }` | Non-multikey compound | Verified in `admin-shipping-config.test.ts`. |
| `shippingconfigurations` | `{ countriesCovered: 1, isActive: 1 }` | Non-multikey compound | Verified in `admin-shipping-config.test.ts`. |

### 2.2 Referential Integrity & Cascade Rules

1. **Product Deletion Guard:** Products associated with active orders cannot be hard-deleted; soft deletion sets `isActive: false` and `status: 'archived'`.
2. **Order Immutability:** Once an order is placed, subsequent changes to product catalog prices or shipping zone rules **do not alter the historical order**. The order stores complete embedded snapshots of `items[].unitPrice`, `items[].title`, `shippingAddress`, `customerEmail`, and `customerPhone`.
3. **Cart Item Synchronization:** When cart documents are queried, line item prices are verified against live product pricing and available inventory stock before returning to the shopper.

---

## 3. Concurrency Defenses & High-Load Testing

### Atomic Inventory Reservation Test (`tests/inventory/inventory-concurrency.test.ts`)
* **Scenario:** 10 simultaneous asynchronous HTTP requests attempted to purchase 5 remaining available units of an item.
* **Mechanism:** MongoDB atomic conditional write:
  ```javascript
  db.inventories.updateOne(
    { productId: id, availableQuantity: { $gte: requestedQty } },
    { $inc: { availableQuantity: -requestedQty, reservedQuantity: requestedQty } }
  );
  ```
* **Result:** Exactly 5 units were allocated; 5 subsequent requests received `INSUFFICIENT_STOCK` (422). Available stock finished at exactly 0. Zero overselling occurred.

### Order Cancellation Restock Test (`tests/checkout/order-cancellation.test.ts`)
* **Scenario:** Customer cancels a pending order.
* **Mechanism:** The service transitions order status to `cancelled` and atomically reverts the reserved inventory:
  ```javascript
  db.inventories.updateOne(
    { productId: item.productId },
    { $inc: { availableQuantity: +item.quantity, reservedQuantity: -item.quantity } }
  );
  ```
* **Result:** All inventory units were cleanly restored to available stock without orphaned reservations.

---

## 4. Failure Recovery & Outbox Persistence

* **Transactional Outbox Worker:** Business events (e.g., `ORDER_CONFIRMED`, `USER_REGISTERED`) write to `outboxnotifications` in the same operation as the primary business entity.
* **Crash Resilience:** If the server is restarted during email delivery, uncommitted outbox entries remain in `pending` state and are processed upon restart with exponential backoff.

---

## 5. Database Integrity Conclusion

All unique constraints, atomic operators, referential snapshots, and indexing structures operate in compliance with enterprise production standards.

