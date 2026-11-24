# Cartiva Mini — Admin Order & Fulfilment Management

## 1. Overview
The order and fulfilment control centre manages customer purchases from payment confirmation through packaging, carrier dispatch, tracking milestone updates, and final delivery confirmation. Reuses the order pipeline from Phase 12 and fulfilment infrastructure from Phase 14.

## 2. Order Lifecycle & Status Progression
Orders strictly adhere to permitted state machine transitions:
```
CONFIRMED ──> PROCESSING ──> PACKED ──> DISPATCHED ──> OUT_FOR_DELIVERY ──> DELIVERED
      │            │           │             │
      └──> CANCELLED <─────────┴─────────────┘ (Subject to policy)
```
- **Payment Verification Gate:** Orders cannot be marked as paid or moved into processing without verified electronic payment records.
- **Historical Snapshots:** Order items preserve immutable pricing, SKU, title, and address snapshots taken at checkout.
- **Endpoints:**
  - `GET /api/v1/admin/orders`: Search by order number, customer email, status, and date range.
  - `GET /api/v1/admin/orders/:identifier`: Comprehensive order details and customer delivery address.
  - `PATCH /api/v1/admin/orders/:identifier/status`: State machine validated status transitions.

## 3. Order Fulfilment & Dispatch
- **Shipment Record Generation:** When an order transitions to `processing` or `dispatched`, a tracking record is created.
- **Carrier Providers:** Integrated with both In-House Delivery and third-party logistics (GIG Logistics, DHL Express).
- **Tracking Timeline:** Append-only tracking milestones with event type, location, carrier reference, and timestamp.
- **Delivery Exceptions:** Operational handling for failed delivery attempts, address verification delays, or customer rescheduling.
- **Endpoints:**
  - `GET /api/v1/fulfilment/orders/ready`: Orders pending packing and dispatch.
  - `POST /api/v1/fulfilment/shipments`: Create shipment and assign tracking reference.
  - `POST /api/v1/fulfilment/shipments/:id/timeline`: Record logistics checkpoint.
  - `POST /api/v1/fulfilment/shipments/:id/delivered`: Confirm delivery with recipient signature reference.
