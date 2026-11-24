# Order Management Architecture & API — Cartiva Mini (Phase 12)

## 1. Customer Order APIs (`/api/v1/orders`)

Customers interact with their orders using strict IDOR protection. Every query or cancellation enforces `order.userId.toString() === customer.id`.

### Endpoints:

- `GET /api/v1/orders?page=1&limit=10`: Returns paginated list of orders placed by the authenticated customer.
- `GET /api/v1/orders/:orderId`: Retrieves full order details including delivery snapshot, item snapshots, carrier information, and live status. Resolves by either MongoDB `_id` or human-readable `orderNumber`.
- `POST /api/v1/orders/:orderId/cancel`: Self-service cancellation.
  - **Eligibility:** Permitted only when `orderStatus` is `PENDING_PAYMENT` or `PAYMENT_FAILED`.
  - **Payload:** `{ reason?: string }`.
  - **Inventory Action:** Automatically releases reserved inventory via `inventoryService.releaseReservation`.
  - **Audit Action:** Logs `ORDER_CANCELLED` event with the customer actor ID.

---

## 2. Administrator Order APIs (`/api/v1/admin/orders`)

All administrative endpoints require `UserRole.ADMIN` or `UserRole.SUPER_ADMIN` privileges. Non-administrative users are rejected with `403 Forbidden`.

### Endpoints:

- `GET /api/v1/admin/orders`: Query orders with advanced filtering options:
  - `search`: Filter by `orderNumber` or customer email substring.
  - `orderStatus`: Filter by specific `OrderStatus` enum.
  - `paymentStatus`: Filter by specific `PaymentStatus` enum.
  - `startDate` & `endDate`: Filter by order creation date range.
  - `page` & `limit`: Pagination parameters.
- `GET /api/v1/admin/orders/:orderId`: Complete admin-level inspection of order details, customer contact data, shipping address, and reservation reference.
- `PATCH /api/v1/admin/orders/:orderId/status`: Execute permitted status transition:
  - **Payload:**
    ```json
    {
      "orderStatus": "processing",
      "trackingNumber": "KWIK-987654321",
      "carrier": "Kwik Delivery",
      "notes": "Package dispatched to Ikeja sorting hub."
    }
    ```
  - **Validation:** Validated against `PERMITTED_STATUS_TRANSITIONS`. Invalid transitions reject with `400 Bad Request` (`INVALID_ORDER_STATUS`).
- `GET /api/v1/admin/orders/:orderId/audit`: Retrieves chronological audit history for the order, including actor names, emails, timestamps, and transition metadata.

---

## 3. Frontend Order Interfaces

1. **Customer Order History (`/orders`):**
   - Paginated table showing order reference, date placed, first item preview thumbnail, total amount, order status badge, and payment status badge.
   - Quick action to view full details or cancel eligible pending-payment orders via an interactive modal with reason input.
2. **Customer Order Details (`/orders/:orderNumber`):**
   - Clean, high-trust presentation of delivery destination, shipping method, transit estimate, items table with SKU and line totals, and full financial breakdown.
   - Transparent Phase 13 pending-payment notice when the order is awaiting gateway settlement.
3. **Admin Order Management (`/admin/orders`):**
   - Real-time search by order reference, filter pills for order status and payment status.
   - Status update modal with state validation and fulfillment tracking input fields.
   - Chronological audit log modal displaying all actions performed on the order.
