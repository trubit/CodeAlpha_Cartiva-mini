# Cartiva Mini — Product Details UI (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Product Detail Page Architecture (`/products/:slug`)

The Product Details interface (`frontend/src/pages/ProductDetailPage.tsx`) provides an immersive product presentation using real backend data fetched via `/api/v1/products/:slug`.

### Components & Features

1. **Interactive Image Gallery:**
   - Primary high-resolution preview with aspect ratio preservation (`contain` fit).
   - Thumbnail carousel allowing instant image switching.
   - Fallback image handling preventing broken image iconography.

2. **Pricing & Promotional Breakdown:**
   - Displays current price, original regular price (with strikethrough), and calculated percentage discount badge.
   - Currency display formatted according to Nigerian Naira standards (`₦`).

3. **Stock & Availability Status:**
   - In Stock badge (green) with real available quantity count.
   - Low Stock warning chip when inventory falls below threshold.
   - Out of Stock alert disabling purchasing controls.

4. **Product Variations Picker:**
   - Displays available options (e.g., sizes, colors, styles) with individual pricing and SKUs.
   - Selecting a variation updates active SKU, price, and stock status.

5. **Quantity Controls & Action Triggers:**
   - Interactive `+` / `-` quantity buttons constrained between 1 and available stock.
   - `Add to Cart` button triggering backend cart synchronization and slide-over drawer opening.
   - `Buy Now` button initiating instant checkout flow.
   - `Wishlist` heart icon with real-time toggle and in-app toast notification.

6. **Information Tabs:**
   - **Description:** Complete product narrative and benefits.
   - **Specifications:** Detailed attributes (SKU, brand, dimensions, weight).
   - **Customer Reviews:** Verified reviews list with rating breakdown and verified customer review submission form.

7. **Related Products Showcase:**
   - Carousel of complementary items from the same category fetched via `/api/v1/products/:slug/related`.
