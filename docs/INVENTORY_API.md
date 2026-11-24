# Cartiva Mini — Inventory & Stock Management REST API

All inventory endpoints are versioned under `/api/v1` and enforce standardized response formats, authentication, and role guards.

---

## Administrative Endpoints (`/api/v1/admin/inventory`)

_All administrative endpoints require `Authorization: Bearer <token>` and `role: admin`._

### 1. List Inventory Overview

- **`GET /api/v1/admin/inventory`**
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20, max: 100)
  - `search` (string)
  - `sku` (string)
  - `status` (`in_stock` | `low_stock` | `out_of_stock` | `untracked`)
  - `lowStockOnly` (boolean)
  - `outOfStockOnly` (boolean)
  - `categoryId` (24-hex ObjectId)

### 2. Inventory Summary Metrics

- **`GET /api/v1/admin/inventory/summary`**
- Returns total counts, total on-hand, total reserved, total available, and breakdown by inventory status.

### 3. Filtered Lists

- **`GET /api/v1/admin/inventory/low-stock`**: Returns items currently at or below threshold.
- **`GET /api/v1/admin/inventory/out-of-stock`**: Returns items with zero available stock.

### 4. Inventory Detail

- **`GET /api/v1/admin/inventory/:inventoryId`**
- Query: `variantId` (optional)
- Returns real-time on-hand, reserved, available stock, threshold, and status.

### 5. Movement History

- **`GET /api/v1/admin/inventory/movements`**: System-wide movement ledger.
- **`GET /api/v1/admin/inventory/:inventoryId/movements`**: Movement ledger for specific target.

### 6. Stock Operations

- **`POST /api/v1/admin/inventory/:inventoryId/initialize`**
  - Body: `{ quantity: number, lowStockThreshold?: number, reason?: string, idempotencyKey?: string }`
- **`POST /api/v1/admin/inventory/:inventoryId/receive`**
  - Body: `{ quantity: number, reason: string, referenceId?: string, idempotencyKey?: string }`
- **`POST /api/v1/admin/inventory/:inventoryId/adjust`**
  - Body: `{ targetQuantity: number, reason: string, referenceId?: string, idempotencyKey?: string }`
- **`POST /api/v1/admin/inventory/:inventoryId/deduct`**
  - Body: `{ quantity: number, reason: string, movementType?: string, referenceId?: string, idempotencyKey?: string }`
- **`PATCH /api/v1/admin/inventory/:inventoryId/threshold`**
  - Body: `{ lowStockThreshold: number }`

---

## Reservation Endpoints (`/api/v1/inventory/reservations`)

### 1. Create Reservation

- **`POST /api/v1/inventory/reservations`**
- Header: `x-session-id` (optional for guests), `Authorization` (optional for logged-in users)
- Body:
  ```json
  {
    "items": [
      {
        "productId": "6ae9f00af0641b5a6a98e2ec",
        "variantId": "6ae9f00af0641b5a6a98e2ed",
        "sku": "TSHIRT-M-BLK",
        "quantity": 2
      }
    ],
    "expiresInMinutes": 15,
    "idempotencyKey": "cart_res_uuid_1234",
    "referenceType": "cart",
    "referenceId": "cart_session_abc"
  }
  ```

### 2. Get Reservation Detail

- **`GET /api/v1/inventory/reservations/:reservationId`**
- Auto-evaluates TTL. If expired, releases stock hold and returns status `expired`.

### 3. Release Reservation

- **`POST /api/v1/inventory/reservations/:reservationId/release`**
- Releases held stock back into available quantity.
