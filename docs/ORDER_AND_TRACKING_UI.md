# Cartiva Mini — Order Management & Delivery Tracking UI (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Order History (`/orders`)

The Order History interface (`frontend/src/pages/OrdersPage.tsx`) presents historical orders fetched from `/api/v1/orders`.

### Display Attributes:
- Order number (e.g., `ORD-20261105-XXXXX`).
- Order placement date and time.
- Total order amount formatted in Nigerian Naira (`₦`).
- Item count and first item thumbnail preview.
- Order status chip (`Pending Payment`, `Processing`, `Confirmed`, `Dispatched`, `Delivered`, `Cancelled`).
- Payment status chip (`Paid`, `Pending`, `Refunded`).
- Direct action buttons: `View Details` and `Track Delivery`.

---

## 2. Order Details (`/orders/:identifier`)

The Order Details interface (`frontend/src/pages/OrderDetailPage.tsx`) provides an authoritative snapshot of a completed order:
- Ordered items snapshot (title, SKU, variation, price at purchase, quantity).
- Delivery address snapshot as of order placement.
- Chosen shipping method, assigned carrier, and tracking number.
- Self-service order cancellation button (available only for eligible statuses prior to dispatch).

---

## 3. Delivery Tracking (`/tracking/:orderNumber`)

The Delivery Tracking interface provides a visual tracking timeline backed by Phase 14 (`/api/v1/shipments/track/:orderNumber`):
- Visual milestone timeline: `Order Placed` -> `Processing` -> `Dispatched` -> `Out for Delivery` -> `Delivered`.
- Carrier tracking details (carrier name, tracking code, dispatch timestamp).
- Delivery exception alerts when weather, address issues, or transit delays occur.
