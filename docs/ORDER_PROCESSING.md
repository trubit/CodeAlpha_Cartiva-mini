# Order Processing Pipeline — Cartiva Mini (Phase 12)

## 1. Core Principles of Order Processing

The Cartiva Mini order processing engine operates under strict e-commerce safety principles:

1. **Immutable Historical Snapshots:** Orders capture point-in-time snapshots of purchased items, prices, delivery addresses, and shipping configurations. Subsequent changes to catalog prices, user profile names, or carrier rates never mutate historical order records.
2. **Integer Minor Unit Financial Math:** All currency calculations are executed in integer minor units (kobo for NGN) to prevent IEEE 754 floating-point rounding errors. Major units are exposed purely as convenient formatted projections.
3. **Atomic Inventory Reservation:** Before any order record is finalized, required item quantities are atomically reserved using the Phase 8 reservation engine with a 30-minute expiry window.
4. **Clean Cart Lifecycle:** The customer's cart is automatically emptied only after the order and inventory reservations have been successfully registered.
5. **Separation of Concerns:** Order creation does not infer payment settlement. Orders are created in `PENDING_PAYMENT` with `PaymentStatus.PENDING`. Phase 13 integrates the actual Paystack payment gateway.

---

## 2. Order Data Model & Snapshots

The `Order` model stores complete operational information:

```typescript
export interface IOrder {
  _id: string;
  orderNumber: string; // Format: ORD-YYYYMMDD-XXXXXX
  userId: string; // Customer reference
  items: IOrderItem[]; // Array of item snapshots
  shippingAddress: IAddressSnapshot; // Point-in-time address snapshot
  shippingMethodId?: string; // Original shipping method ID
  shippingMethodName?: string; // Carrier/Method display name snapshot
  carrier?: string; // Courier name snapshot (e.g. GIG, DHL, Kwik)
  estimatedDeliveryText?: string; // Transit time snapshot
  subtotal: number; // Major units (e.g. 50000.00)
  subtotalMinor: number; // Minor units (e.g. 5000000)
  shippingFee: number; // Major units
  shippingFeeMinor: number; // Minor units
  discountAmount: number; // Major units
  discountAmountMinor: number; // Minor units
  taxAmount: number; // Major units
  taxAmountMinor: number; // Minor units
  totalAmount: number; // Major units (subtotal + shipping - discount + tax)
  totalAmountMinor: number; // Minor units
  currency: string; // Default: 'NGN'
  orderStatus: OrderStatus; // Lifecycle status
  paymentStatus: PaymentStatus; // Financial status
  reservationReference?: string; // Unique Phase 8 reservation ID
  paymentId?: string; // Reserved for Phase 13
  trackingNumber?: string; // Dispatch tracking number (Phase 14)
  notes?: string; // Customer delivery notes
  cancelledAt?: Date; // Timestamp if cancelled
  cancellationReason?: string; // Customer or admin cancellation reason
  createdAt: Date;
  updatedAt: Date;
}
```

### Item Snapshot Structure (`IOrderItem`):

- `productId` (ObjectId)
- `variantId` (ObjectId, optional)
- `sku` (String)
- `title` (String)
- `unitPrice` & `unitPriceMinor`
- `quantity` (Number)
- `subtotal` & `subtotalMinor`
- `thumbnailUrl` (String, optional)

---

## 3. Order Reference Format

Order references follow an unambiguous, collision-resistant format:

```
ORD-YYYYMMDD-XXXXXX
Example: ORD-20261103-9F8K2M
```

- **`ORD-`**: Namespace prefix.
- **`YYYYMMDD`**: UTC date partition facilitating rapid indexing and customer support lookups.
- **`XXXXXX`**: 6-character cryptographically secure uppercase alphanumeric string generated via Node.js `crypto.randomBytes`.

A unique compound database index enforces reference uniqueness across the entire system.

---

## 4. Concurrency & Transaction Architecture

To guarantee consistency:

- When MongoDB replica sets or transactions are supported by the deployment environment, session commit/abort semantics wrap order insertion, reservation, and cart clearing.
- When running in single-node/standalone MongoDB environments (e.g. during local development or test suites), atomic operations are ordered sequentially:
  1. Atomic stock reservation via `inventoryService.createReservation`. If this fails, the process aborts immediately with no database mutation.
  2. Order creation with the reservation reference.
  3. Cart item clearing.
  4. If order creation fails after reservation, the reservation is immediately released via `inventoryService.releaseReservation`.

---

## 5. Audit Logging

Every order-related event creates an audit record in the `AuditLog` collection:

- `ORDER_CREATED`: Recorded with order ID, customer ID, item count, and total amount.
- `ORDER_CANCELLED`: Recorded with cancelling actor (customer or admin) and reason.
- `ORDER_STATUS_UPDATED`: Recorded with previous status, new status, and admin actor ID.
