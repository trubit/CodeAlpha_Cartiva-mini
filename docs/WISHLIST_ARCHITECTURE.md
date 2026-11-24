# Customer Wishlist Architecture

## 1. Overview

The Cartiva Mini Customer Wishlist provides saved-item management for authenticated customers. It allows customers to bookmark products for future purchase, monitor price changes and stock availability, and transfer wishlisted products directly into their shopping cart.

---

## 2. Core Architecture

### 2.1 Database Schema (`backend/src/models/Wishlist.model.ts`)

```typescript
const wishlistSchema = new Schema<WishlistDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);
```

### 2.2 Deduplication Guarantee

To prevent duplicate bookmark entries for the same product, a Mongoose `pre('save')` hook filters incoming items using a `Set<string>` of product IDs.

### 2.3 Live Pricing and Stock Hydration

When a customer requests their wishlist (`GET /api/v1/wishlist`), the service evaluates each wishlisted product against the live catalog and inventory ledger:

- Revalidates current regular price and active sale windows.
- Resolves current stock availability via `inventoryRepository.resolveTarget`.
- If a product is unpublished or soft-deleted, it is safely flagged with `isAvailable: false` and `availabilityMessage: 'This product is no longer available.'` rather than throwing errors or breaking the UI.

---

## 3. Move-to-Cart Operation

The endpoint `POST /api/v1/wishlist/items/:itemId/move-to-cart` coordinates the transition between wishlist and cart:

1. Locates the wishlist item by item `_id` or `productId`.
2. Verifies stock availability and publication status.
3. Adds the item to the customer's cart via `cartService.addItem({ userId }, ...)`.
4. Removes the item from the customer's wishlist.
5. Returns both the updated `cart` and `wishlist` DTOs in a single response.
