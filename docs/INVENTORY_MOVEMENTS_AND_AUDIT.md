# Cartiva Mini — Inventory Movements & Audit Ledger

## 1. Overview

The `inventory_movements` collection acts as an append-only, immutable financial and operational ledger for all stock adjustments in Cartiva Mini. Direct deletion or in-place modification of records in this collection is strictly prohibited at the application and schema layers.

---

## 2. Movement Record Schema

| Field           | Type      | Description                                                                                    |
| :-------------- | :-------- | :--------------------------------------------------------------------------------------------- |
| `productId`     | ObjectId  | Reference to target product                                                                    |
| `variantId`     | ObjectId? | Optional reference to specific product variation                                               |
| `sku`           | String    | Normalized uppercase SKU (indexed)                                                             |
| `movementType`  | String    | Operation category enum                                                                        |
| `quantity`      | Number    | Signed integer delta                                                                           |
| `previousStock` | Number    | Stock quantity before change                                                                   |
| `newStock`      | Number    | Stock quantity after change                                                                    |
| `reason`        | String    | Mandatory audit justification                                                                  |
| `referenceType` | String    | Source domain context (`order`, `purchase_order`, `manual`, `reservation`, `cart`, `checkout`) |
| `referenceId`   | String?   | External reference number (PO, Order, Reservation)                                             |
| `operatorId`    | ObjectId? | Authenticated user or system actor ID                                                          |
| `timestamp`     | Date      | UTC timestamp (indexed)                                                                        |

---

## 3. Mathematical Consistency Invariant

To ensure accounting precision, the Mongoose schema enforces the mathematical invariant:

$$\text{newStock} \equiv \text{previousStock} + \text{quantity}$$

Any attempt to record a movement document where the delta does not equal the difference between previous and resulting stock fails schema validation immediately.

---

## 4. Querying and Reporting

Administrators can inspect movements via:

- `GET /api/v1/admin/inventory/movements`: System-wide movement feed with date filtering and pagination.
- `GET /api/v1/admin/inventory/:inventoryId/movements`: Filtered feed for a specific product or variant.

Compound indexes on `{ productId: 1, timestamp: -1 }` and `{ sku: 1, timestamp: -1 }` guarantee fast pagination and search performance without loading historical data into application memory.
