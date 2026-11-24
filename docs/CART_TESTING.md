# Shopping Cart & Wishlist Testing Suite

## 1. Overview

Phase 10 introduces automated integration tests covering the complete Shopping Cart and Wishlist lifecycle. All tests execute against an isolated in-memory MongoDB instance using Vitest, guaranteeing real database queries without affecting production or development data.

---

## 2. Test Suites & Coverage

### 2.1 Cart Operations (`tests/cart/cart-operations.test.ts`)

- **Guest Cart Creation:** Verifies opaque guest token generation and header/cookie transmission.
- **Guest Cart Retrieval:** Verifies access to guest items via `x-guest-cart-token`.
- **Customer Cart Addition:** Verifies cart ownership and persistent user-bound cart.
- **Product Variations:** Validates adding specific variants with independent SKU, title, and pricing.
- **Duplicate Prevention & Quantity Merging:** Asserts quantities are combined when re-adding identical items.
- **Input Validation:** Confirms rejection of 0, negative, and excessive quantities ($>99$).
- **Atomic Inventory Enforcement:** Rejects adding quantities exceeding available stock ($stockQuantity - reservedQuantity$).
- **Publication Isolation:** Asserts draft and unpublished products cannot be added to cart.
- **Server Price Validation:** Confirms client-submitted prices are ignored in favor of database pricing.
- **Price Change Detection:** Validates recalculation and notification when catalog prices change while items are in cart.
- **Item Quantity Update:** Validates `PATCH /api/v1/cart/items/:itemId`.
- **Item Removal:** Validates `DELETE /api/v1/cart/items/:itemId`.
- **Cart Clearing:** Validates `DELETE /api/v1/cart`.
- **IDOR Protection:** Verifies Customer A cannot view or modify Customer B's cart.

### 2.2 Cart Merge (`tests/cart/cart-merge.test.ts`)

- **Guest-to-Customer Merge:** Verifies combining matching items and appending distinct items.
- **Stock Depletion Warnings:** Verifies out-of-stock guest items are excluded with informative warnings.
- **Guest Cart Deletion:** Confirms guest cart record is purged after merge to prevent duplicate merges.
- **Authentication Guard:** Asserts unauthenticated merge attempts return HTTP 401.

### 2.3 Customer Wishlist (`tests/cart/wishlist.test.ts`)

- **Bookmark Addition:** Verifies adding products to customer wishlist.
- **Deduplication:** Confirms adding duplicate products is idempotent.
- **Live Hydration:** Verifies retrieval populates real-time pricing and stock availability.
- **Move to Cart:** Validates atomic transfer from wishlist to shopping cart.
- **Item Removal:** Validates deleting wishlisted items.
- **Publication Check:** Rejects wishlisting draft or unreleased items.
- **IDOR Protection:** Verifies wishlist isolation across distinct customer accounts.

---

## 3. Running the Test Suite

```bash
# Run all Phase 10 cart and wishlist test suites
npx vitest run tests/cart/

# Run individual test suites
npx vitest run tests/cart/cart-operations.test.ts
npx vitest run tests/cart/cart-merge.test.ts
npx vitest run tests/cart/wishlist.test.ts
```
