# Cartiva Mini — Cart & Wishlist UI (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Shopping Cart Experience (`/cart`)

The Shopping Cart (`frontend/src/pages/CartPage.tsx` and `CartDrawer.tsx`) provides transparent, real-time order building backed by the Phase 10 cart APIs (`/api/v1/cart`).

### Key Capabilities
- **Server-Authoritative Totals:**
  - Item quantities, unit prices, line totals, and subtotal are validated and calculated by the backend.
  - Zero reliance on client-side floating point mathematics.
- **Quantity Management:**
  - Inline increment, decrement, and item removal triggers.
  - Backend validation automatically prevents requesting quantities beyond verified warehouse inventory.
- **Coupon Code Validation:**
  - Integrated with `couponService.validateCoupon` (`/api/v1/coupons/validate`).
  - Clear success feedback displaying discount percentage/value and error feedback for expired or invalid codes.
- **Free Shipping Progress Tracker:**
  - Visual progress bar tracking cart value toward the ₦50,000 nationwide free shipping threshold.
- **Direct Navigation:**
  - `Continue Shopping` link returning to `/shop`.
  - `Proceed to Checkout` button routing authenticated customers to `/checkout`.

---

## 2. Customer Wishlist Experience (`/wishlist`)

The Wishlist interface (`frontend/src/pages/WishlistPage.tsx`) provides saved items management backed by the Phase 10 wishlist API (`/api/v1/wishlist`).

### Features
- **Saved Products Grid:**
  - Displays product thumbnail, title, current price, and stock status.
- **Instant Move to Cart:**
  - Moves item directly into active shopping cart while updating wishlist state in a single click.
  - Automatically opens the cart drawer with a confirmation toast.
- **Item Removal:**
  - Fast deletion with immediate cache invalidation and toast feedback.
- **Empty State:**
  - Clean illustration guiding customer back to browsing.
