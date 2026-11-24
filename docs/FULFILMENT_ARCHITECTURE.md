# Cartiva Mini — Fulfilment Architecture
**Phase 14: Order Fulfilment & Tracking**

---

## 1. Overview
The Fulfilment Architecture connects verified payments (Phase 13) with physical warehouse staging, carrier coordination, append-only milestone tracking, delivery confirmation, and exception management.

```
┌─────────────────────────────────┐
│     Phase 13 Verified Payment   │
│     order.paymentStatus = PAID  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│    Order Fulfilment Service     │
│   - Validates Payment Gate      │
│   - Enforces State Transitions  │
└───────┬───────────────────┬─────┘
        │                   │
        ▼                   ▼
┌──────────────┐    ┌───────────────┐
│ Order Model  │    │Shipment Model │
│(orderStatus) │    │  (events[])   │
└──────────────┘    └───────┬───────┘
                            │
                            ▼
               ┌──────────────────────────┐
               │ Carrier Provider Factory │
               │- In-House Logistics      │
               │- Courier Partners (GIG,  │
               │  DHL, FedEx)             │
               └──────────────────────────┘
```

---

## 2. Core Architectural Pillars

### A. Strict Payment Verification Gate
No order enters fulfilment staging without authoritative server-side payment verification. Browser redirects, client callbacks, and pending payments are strictly rejected with `ORDER_NOT_ELIGIBLE_FOR_FULFILMENT`.

### B. Provider-Independent Carrier Abstraction
The system utilizes the `ICarrierProvider` interface and `CarrierProviderFactory` to decouple business logic from logistics vendors. Carrier tracking updates clearly distinguish between `manual` staff updates, `carrier` automated syncs, and `system` state changes.

### C. Append-Only Tracking Event Timeline
Every milestone or status update creates a new immutable event inside `shipment.events`. Historical entries are never overwritten or deleted, ensuring full auditability.

---

## 3. Relationships & Data Schema
- Each `Shipment` references an `Order` via `orderId` and `orderNumber`.
- Exactly one active shipment is permitted per order; duplicate creation is rejected.
- Recipient address snapshot is cloned from the order to prevent post-checkout address mutations.
