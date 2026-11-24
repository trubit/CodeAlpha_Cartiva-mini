# Cartiva Mini — Stock Management Operations

## 1. Overview

Cartiva Mini enforces strict operational controls over inventory modifications. Direct, unverified updates to database stock fields are forbidden. Every change to physical or reserved stock must proceed through dedicated service routines with validation, atomic concurrency guards, and movement ledger logging.

---

## 2. Core Stock Quantity Rules

1. **Non-Negative Integer Enforcement**: All stock quantities (`stockQuantity`, `reservedQuantity`, `availableQuantity`, `quantity`) must be non-negative integers ($0 \le Q \le 1,000,000$). Fractional units are disallowed.
2. **Atomic Updates**: Modifications use atomic increments/decrements at the MongoDB engine layer. No in-memory state is assumed to remain valid across network hops.
3. **Negative Stock Disallowed**: Under no circumstances can available or on-hand stock drop below zero. Conditional guards reject operations that would violate this boundary.
4. **Mandatory Audit Justification**: Every manual adjustment, deduction, or receipt requires a descriptive reason string (min 3 characters, max 300 characters).
5. **No Silent Modifications**: Every quantity shift generates an immutable record in `inventory_movements`.

---

## 3. Supported Stock Operations

### A. Initial Stock Setup (`POST /api/v1/admin/inventory/:inventoryId/initialize`)

- Configures starting stock and optional low-stock threshold for a product or variant.
- **Duplicate Prevention**: If an `initial_stock` movement already exists for the SKU, the request is rejected with `ALREADY_INITIALIZED` (400).
- Records movement with type `initial_stock` and delta `+quantity`.

### B. Receive Stock (`POST /api/v1/admin/inventory/:inventoryId/receive`)

- Atomically increments physical on-hand stock (`$inc: { stockQuantity: delta }`).
- For variations, atomically increments variant stock and parent aggregate stock simultaneously.
- Accepts an optional `referenceId` (e.g., Purchase Order number `PO-12345`).
- Records movement with type `restock`.

### C. Deduct Stock (`POST /api/v1/admin/inventory/:inventoryId/deduct`)

- Used for damaged goods, warehouse losses, or physical write-offs.
- Enforces conditional update:
  - Standalone: `{ _id: productId, stockQuantity: { $gte: delta } }`
  - Variant: `{ _id: productId, variants: { $elemMatch: { _id: variantId, stockQuantity: { $gte: delta } } } }`
- Rejects with `INSUFFICIENT_STOCK` (400) if requested deduction exceeds available stock.
- Records movement with type `damaged_stock`, `lost_stock`, or `stock_correction`.
- Automatically evaluates resulting available stock against `lowStockThreshold` and triggers alert if needed.

### D. Manual Stock Adjustment (`POST /api/v1/admin/inventory/:inventoryId/adjust`)

- Reconciles physical warehouse count to a target quantity.
- Verifies that `targetQuantity >= reservedQuantity` so reservations are not compromised.
- Calculates delta (`targetQuantity - previousStock`) and updates stock atomically.
- Records movement with type `manual_adjustment`.

### E. Low-Stock Threshold Configuration (`PATCH /api/v1/admin/inventory/:inventoryId/threshold`)

- Updates `lowStockThreshold` (integer between 0 and 100,000).
- Modifies variant threshold independently or parent product threshold.

---

## 4. Low-Stock & Out-of-Stock Alert Generation

1. When a stock operation reduces available stock below or equal to `lowStockThreshold`, the alert pipeline is triggered.
2. **12-Hour Deduplication Window**: The system checks `Notification` records created within the last 12 hours for matching SKU to prevent spamming administrators on repeated transactions.
3. If no alert exists within the deduplication window, a new notification of type `low_stock` is generated for warehouse administration.
