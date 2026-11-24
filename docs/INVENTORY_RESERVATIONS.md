# Cartiva Mini — Inventory Reservation Foundation

## 1. Purpose & Phase Boundaries

Phase 8 introduces the **Inventory Reservation Foundation** to safeguard against overselling and race conditions during high-volume customer cart and checkout activity.

> **Phase Boundary Note**: The complete Cart lifecycle (Phase 10) and Checkout/Order Processing lifecycle (Phase 12) will consume this foundation. Phase 8 provides the backend reservation services, concurrency guards, and data models without prematurely implementing cart controllers or checkout payment flows.

---

## 2. Reservation Lifecycle

```
       [ Customer Adds to Cart / Initiates Checkout ]
                             │
                             ▼
                  [ createReservation ]
                  ├─ Atomic conditional hold
                  ├─ Idempotency key verified
                  └─ TTL timer established (15–60 min)
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
       [ Payment Successful ]   [ Cart Abandoned / Cancelled ]
                 │                       │
                 ▼                       ▼
        [ confirmReservation ]   [ releaseReservation ]
        ├─ Deduct physical on-hand ├─ Decrement reserved hold
        ├─ Decrement reserved hold ├─ Available stock restored
        ├─ Status: CONFIRMED     ├─ Status: RELEASED
        └─ Movement: PURCHASE    └─ Movement: RES_RELEASE
```

---

## 3. Concurrency Protection & Overselling Prevention

To guarantee that two simultaneous customers cannot reserve or purchase the last remaining item:

1. **Atomic Conditional Updates**:
   Reservations evaluate availability at database execution time using MongoDB `$expr`:
   ```javascript
   db.products.updateOne(
     {
       _id: productId,
       $expr: {
         $gte: [
           {
             $subtract: [{ $ifNull: ['$stockQuantity', 0] }, { $ifNull: ['$reservedQuantity', 0] }],
           },
           requestedQuantity,
         ],
       },
     },
     { $inc: { reservedQuantity: requestedQuantity } }
   );
   ```
2. **Compensating Rollback on Batch Failure**:
   When a customer reserves multiple items in a single request, if any item fails due to stock depletion during concurrent checkout, all previously reserved items in that batch are immediately released atomically, ensuring transactional consistency.
3. **Idempotency Protection**:
   The `idempotencyKey` field (sparse unique index) ensures that network retries or double-clicked submit buttons do not double-reserve stock. Duplicate requests return the existing reservation response.

---

## 4. TTL & Expiration Handling

- Each reservation has an explicit UTC `expiresAt` timestamp (default: 15 minutes, configurable up to 60 minutes).
- **Backend-Enforced Expiration**: Rather than trusting frontend timers, expiration is evaluated server-side whenever a reservation is accessed or processed.
- If a reservation is retrieved past its TTL while in `pending` status:
  1. The reserved holds on products/variants are automatically released (`atomicReleaseItem`).
  2. The reservation status is transitioned to `expired`.
  3. A `reservation_release` audit movement is logged.

---

## 5. Integration Contract for Phases 10 & 12

- **Phase 10 (Shopping Cart)**:
  - Calls `inventoryService.createReservation({ items, referenceType: 'cart', referenceId: cartId })`.
  - When a customer removes an item or cart session expires, calls `inventoryService.releaseReservation(reservationId)`.
- **Phase 12 (Checkout & Orders)**:
  - On order payment confirmation via Paystack webhook, calls `inventoryService.confirmReservation(reservationId, orderId)`.
  - Physical on-hand stock is decremented and reserved hold is cleared.
