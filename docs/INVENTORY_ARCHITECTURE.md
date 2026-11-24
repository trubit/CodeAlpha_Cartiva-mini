# Cartiva Mini — Inventory & Stock Management Architecture

## 1. Executive Summary

Phase 8 implements the complete inventory and stock management foundation for Cartiva Mini. The system guarantees atomic stock modifications, prevents overselling through database-level conditional constraints, maintains an immutable movement ledger for comprehensive auditability, tracks variation-level stock independently, and introduces a high-concurrency reservation foundation for future Cart (Phase 10) and Checkout/Order Processing (Phase 12) integration.

---

## 2. Inventory Data Model

Inventory tracking in Cartiva Mini is built upon three primary MongoDB collections and schema structures:

1. **`products` collection**:
   - For standalone products (where `hasVariants: false`):
     - `stockQuantity`: Physical on-hand stock count (non-negative integer).
     - `reservedQuantity`: Quantity held by pending reservations.
     - `lowStockThreshold`: Configurable threshold for alert triggering (default: 5).
     - `isInventoryTracked`: Boolean flag indicating whether inventory operations and alerts apply.
   - For variation-enabled products (where `hasVariants: true`):
     - Parent `stockQuantity`: Synchronized aggregate of all child variant quantities.
     - Parent `reservedQuantity`: Synchronized aggregate of all child variant reservations.
     - Child `variants` array of subdocuments:
       - `_id`: Unique variant identifier.
       - `sku`: Unique variant stock-keeping unit.
       - `title`: Variation title (e.g., "Small / Black").
       - `stockQuantity`: Physical on-hand stock count for this specific variation.
       - `reservedQuantity`: Reserved stock count for this variation.
       - `lowStockThreshold`: Variation-level alert threshold (falls back to parent if unset).
       - `isInventoryTracked`: Tracking flag for the variation.

2. **`inventory_movements` collection (`InventoryMovement` model)**:
   - Append-only, immutable audit ledger recording every operational stock change.
   - Fields:
     - `productId`: ObjectId reference to parent product.
     - `variantId`: Optional ObjectId reference to specific variation.
     - `sku`: Normalized uppercase SKU.
     - `movementType`: Enum (`initial_stock`, `restock`, `stock_received`, `manual_adjustment`, `stock_correction`, `damaged_stock`, `lost_stock`, `return_restock`, `reservation`, `reservation_release`, `purchase_deduction`).
     - `quantity`: Signed integer delta (+ for additions, - for reductions).
     - `previousStock`: Stock quantity before operation.
     - `newStock`: Resulting stock quantity (`newStock === previousStock + quantity`).
     - `reason`: Mandatory operational or audit justification.
     - `referenceType`: Enum (`order`, `purchase_order`, `manual`, `reservation`, `cart`, `checkout`).
     - `referenceId`: Optional external identifier (PO number, order ID, reservation ID).
     - `operatorId`: ObjectId reference to administrator or system actor.
     - `timestamp`: UTC creation timestamp (immutable, indexed).

3. **`inventory_reservations` collection (`InventoryReservation` model)**:
   - Ephemeral hold documents supporting cart and checkout reservations.
   - Fields:
     - `reservationId`: Unique external reservation key (`res_<timestamp>_<randomHex>`).
     - `userId`: Optional authenticated customer ID.
     - `sessionId`: Optional guest session identifier (`x-session-id`).
     - `items`: Array of `{ productId, variantId?, sku, quantity }`.
     - `status`: Enum (`pending`, `confirmed`, `released`, `expired`).
     - `expiresAt`: Expiration timestamp (default: 15 minutes, range: 15–60 minutes).
     - `idempotencyKey`: Unique sparse key preventing double reservation on retry.
     - `confirmedAt` / `releasedAt`: Lifecycle tracking timestamps.

---

## 3. Stock Availability Calculation

Stock availability is strictly calculated at runtime across controllers and services using the uniform formula:

$$\text{Available Stock} = \max(0, \text{On-Hand Stock} - \text{Reserved Stock})$$

- **On-Hand Stock (`stockQuantity`)**: Physical units residing in warehouse or distribution shelves.
- **Reserved Stock (`reservedQuantity`)**: Units temporarily earmarked for customer carts or checkout sessions awaiting payment confirmation.
- **Available Stock (`availableQuantity`)**: Units free for new customer reservation or immediate operational adjustment.

### Inventory Status State Machine

```
              ┌──────────────────────────┐
              │ isInventoryTracked == false │
              └────────────┬─────────────┘
                           ▼
                     [ UNTRACKED ]
                           │
      ┌────────────────────┴────────────────────┐
      ▼                                         ▼
Available == 0                         Available <= Threshold
      ▼                                         ▼
[ OUT_OF_STOCK ]                           [ LOW_STOCK ]
                                                │
                                                ▼ (Available > Threshold)
                                           [ IN_STOCK ]
```

---

## 4. Multi-Modal Target Resolution (`resolveTarget`)

Administrators, warehouse scanners, and automated checkout processes reference inventory using different identifiers. The `InventoryRepository.resolveTarget()` method unifies target resolution across three tiers:

1. **Direct Product ObjectId**: Checks `Product.findById(identifier)`.
2. **Variant ObjectId**: Checks `Product.findOne({ 'variants._id': identifier })` and automatically binds `targetVariantId`.
3. **SKU Matching**: Matches `sku` or `variants.sku` (case-insensitive normalized uppercase).

This allows any inventory endpoint (e.g., `/api/v1/admin/inventory/:inventoryId`) to operate interchangeably on product IDs, variant IDs, or SKUs.

---

## 5. Required MongoDB Deployment Capabilities

- **Single Document Conditional Atomicity**: Leverages native MongoDB atomic conditional updates (`findOneAndUpdate`, `updateOne` with `$expr` and `$elemMatch`). Compatible with standalone MongoDB instances (local development & Vitest test runners) and replica set clusters.
- **Multi-Document Consistency (Replica Sets)**: When deploying to multi-node replica set clusters in staging and production, batch operations optionally enlist Mongoose sessions for two-phase commit parity.
