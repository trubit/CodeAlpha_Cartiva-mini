# CARTIVA MINI — PHASE 18 DATA FLOW ARCHITECTURE

**Project:** Cartiva Mini  
**Phase:** 18 of 20 (Full-Stack Integration & Optimization)  
**Status:** COMPLETE & VERIFIED  

---

## 1. Primary Business Data Lifecycles

This document diagrams and formalizes the data flow models, state transition machines, and concurrency safety guarantees powering Cartiva Mini.

---

## 2. Cart to Order Lifecycle

```
[Customer / Guest]
       │  Adds items to Cart
       ▼
[Cart Document in MongoDB]
       │  • Snapshot of SKU, unitPrice, title
       │  • Auto-adjusted against live available stock
       ▼
[Authentication Gate]
       │  If guest logs in:
       ▼
[Atomic Cart Merge: /api/v1/cart/merge]
       │  • Guest session cart merged with User cart
       │  • Quantities summed; clamped to available stock
       ▼
[Checkout Session: /api/v1/checkout/session]
       │  • Validates selected delivery address
       │  • Queries regional ShippingConfiguration
       │  • Locks calculated shipping fee and tax
       ▼
[Order Placement: /api/v1/checkout/place-order]
       │  • Generates Order Number (e.g. ORD-20261109-A1B2C3)
       │  • Atomic Stock Reservation ($inc: { available: -quantity, reserved: +quantity })
       │  • Order Status initialized to 'pending'
       │  • Payment Status initialized to 'pending'
       │  • Active Cart is cleared
       ▼
[Order Document Persisted]
```

---

## 3. Paystack Payment Flow & Reconciliation

```
[Order Created]
       │
       ▼
[Payment Initialization: /api/v1/payments/initialize]
       │  • Backend calls Paystack API: POST /transaction/initialize
       │  • Sends amount in Kobo (NGN * 100), email, reference, callback_url
       │  • Receives access_code and authorization_url
       ▼
[Frontend Inline / Modal Popup]
       │  • Paystack pop-up displays payment methods (Card, Transfer, USSD)
       │  • Customer completes payment authorization
       ▼
[Two-Pronged Reconciliation]
   ┌───────────────────────────────────┴───────────────────────────────────┐
   ▼                                                                       ▼
[Frontend Callback]                                             [Server-to-Server Webhook]
• Redirects to /payment/callback                                • POST /api/v1/payments/webhook
• Calls /api/v1/payments/verify/:reference                      • Raw request body buffered
• Backend calls Paystack verify endpoint                        • Computes HMAC SHA512 using PAYSTACK_SECRET_KEY
• Displays Success / Receipt view to shopper                    • Compares against 'x-paystack-signature' header
                                                                           │
                                                                           ▼
                                                                [Event: charge.success]
                                                                • Finds matching Order by reference
                                                                • Transitions Payment to 'paid'
                                                                • Transitions Order to 'confirmed'
                                                                • Commits reserved inventory to sold
                                                                • Emits ORDER_CONFIRMED to Outbox
```

---

## 4. Order Fulfilment & Live Tracking State Machine

```
               [Order Placed] (status: pending)
                      │
                      ▼
               [Payment Received] (status: confirmed)
                      │
                      ▼
               [Admin / Warehouse Review]
                      │
                      ├──────────────────────────┐
                      ▼                          ▼
               [status: processing]      [status: cancelled]
                      │                          │
                      │                          └─► Reserved inventory released
                      ▼
               [Carrier Dispatched] (status: shipped)
                      │  • Tracking number generated
                      │  • Waypoint milestone appended: "Dispatched from Port Harcourt Hub"
                      ▼
               [Courier In Transit] (status: out_for_delivery)
                      │  • Waypoint milestone appended: "With local delivery driver"
                      ▼
               [Doorstep Delivery] (status: delivered)
                      │  • Signed confirmation
                      │  • Delivered milestone recorded
                      ▼
               [Fulfilment Complete]
```

### State Machine Constraints (`PERMITTED_STATUS_TRANSITIONS`)

```typescript
export const PERMITTED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.FAILED_DELIVERY],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED_DELIVERY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [],
};
```

---

## 5. Reliable Transactional Outbox Pattern

To eliminate lost emails and notification failures due to network timeouts:

```
[Domain Service (Order / Auth)]
       │
       ▼
[Database Transaction]
  ├─ Updates Business Model (Order / User)
  └─ Inserts Outbox Notification Record { event, payload, status: 'pending', retryCount: 0 }
       │
       ▼ (Committed to MongoDB)
[Background Outbox Worker]
       │  Polls pending notifications every 5 seconds
       ▼
[Notification Dispatcher]
  ├─ Renders HTML template (Order Confirmation / Welcome / OTP)
  ├─ Dispatches via Transport (Email / Simulated Service)
  │     ├── Success ──► Marks record as 'sent', records sentAt timestamp
  │     └── Failure ──► Increments retryCount; applies exponential backoff
  └───────────────────► If retries > 5, marks as 'dead_letter' for admin review
```

---

## 6. Concurrency & Race-Condition Mitigations

1. **Atomic Overselling Protection:** Stock is decremented using MongoDB conditional operators:
   ```javascript
   db.inventory.updateOne(
     { productId: id, availableQuantity: { $gte: requestedQty } },
     { $inc: { availableQuantity: -requestedQty, reservedQuantity: requestedQty } }
   );
   ```
   If 10 concurrent requests target 5 remaining items, exactly the first 5 succeed; the remaining 5 fail cleanly with `INSUFFICIENT_STOCK`.

2. **Idempotent Webhook Processing:** Paystack webhook events are logged by unique event ID or reference. Subsequent replay attempts detect existing completed transactions and return `200 OK` without duplicating state updates.

3. **Optimistic Locking:** Entity models maintain internal `version` (`__v`) counters to reject stale write attempts during concurrent administrative edits.

