# Shopping Cart Architecture

## 1. Overview

The Cartiva Mini Shopping Cart system provides high-performance, persistent cart management for both authenticated customers and unauthenticated guest visitors. It enforces strict server-side price validation, real-time atomic inventory availability verification (Phase 8 integration), currency consistency, minor unit financial arithmetic, and seamless guest-to-customer cart merging upon login.

---

## 2. Core Architectural Principles

1. **Dual Ownership (Authenticated & Guest):**
   - **Authenticated Customers:** Carts are bound to `userId: ObjectId` with a unique index, ensuring one persistent server-side cart per customer across all devices and sessions.
   - **Guest Visitors:** Carts are identified by an unguessable opaque UUID token (`sessionId: String`), transmitted via the `x-guest-cart-token` HTTP header and secure `cartiva_guest_cart_token` cookie.
2. **Zero Client Trust:**
   - Client-submitted prices, discounts, line totals, and subtotals are completely ignored.
   - Authoritative prices are retrieved directly from the database at request time.
3. **Minor Unit Integer Arithmetic:**
   - All financial amounts are calculated and stored in integer minor units (e.g. kobo or cents: $\text{Amount} \times 100$) before converting to major currency units, eliminating floating-point rounding errors.
4. **No Premature Inventory Reservation:**
   - Adding items to the cart verifies availability against Phase 8 atomic stock ($stockQuantity - reservedQuantity > 0$), but does **not** reserve stock. Stock reservation occurs strictly during checkout (Phase 12) to prevent cart abandonment from starving warehouse inventory.
5. **Automatic Guest Cart Expiry:**
   - Guest carts leverage a MongoDB native TTL index on `expiresAt` with a 30-day window, ensuring automatic database cleanup with zero background cron overhead.

---

## 3. Data Model & Database Integrity

### 3.1 Cart Schema (`backend/src/models/Cart.model.ts`)

```typescript
const cartSchema = new Schema<CartDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      unique: true,
    },
    sessionId: {
      type: String,
      sparse: true,
      unique: true,
    },
    items: [cartItemSchema],
    currency: {
      type: String,
      default: 'NGN',
      uppercase: true,
      trim: true,
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      index: { expires: 0 }, // TTL auto-purge
    },
  },
  { timestamps: true }
);
```

### 3.2 Subtotal Calculation Hook

A Mongoose `pre('save')` hook enforces accurate subtotal calculations across all line items using minor units:

```typescript
cartSchema.pre('save', function (next) {
  const subtotalMinor = this.items.reduce(
    (sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity,
    0
  );
  this.subtotal = subtotalMinor / 100;
  next();
});
```

---

## 4. Quantity & Inventory Safety

- **Minimum Quantity:** 1 unit.
- **Maximum Quantity:** 99 units per line item.
- **Duplicate Prevention:** Adding an item that already exists in the cart merges the quantities up to the lower of available stock or 99.
- **Atomic Stock Checks:** Evaluated using `inventoryRepository.resolveTarget(productId, variantId)`.
