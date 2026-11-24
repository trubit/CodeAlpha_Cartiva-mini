# Database & Business Logic Consistency — Cartiva Mini

**Project:** Cartiva Mini  
**Phase:** 18 (Database Audit & Concurrency Control)  
**Status:** Audited & Verified  

---

## 1. Relational Integrity & Data Models

Cartiva Mini enforces strict schema validation and reference integrity across its Mongoose models:

- **Users $\leftrightarrow$ Addresses:** One-to-many relationship with `isDefault` uniqueness enforcement per customer.
- **Orders $\leftrightarrow$ Snapshots:** Orders store immutable snapshots of purchased items, pricing in minor units (Kobo), and delivery addresses. Subsequent changes to product catalog prices or user profile addresses never alter historical order records.
- **Orders $\leftrightarrow$ Payments:** One-to-one relationship linked via `paymentId` and shared `orderNumber` / `reference`.
- **Shipments $\leftrightarrow$ Orders:** One-to-one relationship tracking carrier, dispatch dates, and milestone timelines.
- **Inventory $\leftrightarrow$ Reservations:** Reservations lock stock quantities atomically during checkout to prevent overselling.

---

## 2. Concurrency Control & Race Condition Mitigation

### 2.1 Prevention of Overselling
Stock reservations utilize atomic MongoDB operations (`findOneAndUpdate` with condition `stockQuantity >= requestedQuantity`):
```ts
const updated = await Product.findOneAndUpdate(
  { _id: productId, stockQuantity: { $gte: quantity } },
  { $inc: { stockQuantity: -quantity } },
  { new: true }
);
```
If concurrent checkout requests compete for the last item in inventory, only one transaction succeeds; subsequent callers receive an immediate `OUT_OF_STOCK` error.

### 2.2 Payment Webhook Idempotency
Paystack webhooks are protected against replay attacks and duplicate deliveries:
1. Every incoming webhook event is checked against `WebhookEvent` model using its unique `event.id` or `data.reference`.
2. Duplicate deliveries are acknowledged immediately with HTTP 200 without reprocessing payment status, preventing double-credit or double-fulfillment errors.

### 2.3 Order Cancellation & Reservation Expiry
Reservations have an authoritative 30-minute expiration. Unpaid or expired sessions trigger background inventory release, returning reserved units back to available stock.

