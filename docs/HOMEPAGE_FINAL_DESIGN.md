# Cartiva Mini — Homepage Final Design (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Homepage Structure & Section Hierarchy

The Cartiva Mini homepage (`frontend/src/pages/HomePage.tsx`) delivers an engaging, modern e-commerce storefront driven entirely by real backend data.

### Section 1: Hero Showcase (Edge-to-Edge Full-Bleed Implementation)
- **Container Layout:** Full-bleed edge-to-edge hero container (`minHeight: { xs: 480, sm: 540, md: 620 }px`).
- **Edge-to-Edge Image:** High-resolution lifestyle photography fills 100% width and height using `position: 'absolute'`, `width: '100%'`, `height: '100%'`, `objectFit: 'cover'`, and `objectPosition: 'center 25%'`.
- **Professional Gradient Overlay:** Multi-stop dark gradient overlay positioned directly over the image:
  `linear-gradient(to right, rgba(16, 29, 59, 0.94) 0%, rgba(16, 29, 59, 0.78) 55%, rgba(16, 29, 59, 0.40) 100%)`
  (and responsive vertical gradient on mobile: `linear-gradient(to bottom, rgba(16, 29, 59, 0.92) 0%, rgba(16, 29, 59, 0.75) 100%)`).
- **Content Placement On Top:** All hero copy, typography, CTAs, and docks render directly on top with `zIndex: 2`:
  - **Headline:** `Shop Smart. Live Better.` (High-contrast `#FFFFFF` with warm yellow accent).
  - **Tagline:** `Everything You Need, Just a Click Away.` (Golden accent `#FFB900`).
  - **Body Copy:** "Discover amazing products, unbeatable prices and fast delivery — all in one place." (High-contrast `#CBD5E1`).
  - **CTAs:**
    - `Shop Now` (Primary CTA styled in Warm Gold `#FFB900` with Deep Navy text `#101D3B`).
    - `Explore Deals` (Secondary ghost CTA with white border `#FFFFFF`).
  - **Promotional Badge:** `Up to 70% OFF` rotating badge with star icon.
  - **Category Quick-Jump Dock:** Glassmorphic horizontal dock linking to Popular, Tech, Fashion, Home, and Beauty.

### Section 2: Trust & Shopping Benefits Strip
Five genuine brand trust pillars rendered in a clean, elevated white card:
1. **Fast & Reliable Delivery:** Nationwide doorstep shipping across Nigeria.
2. **Secure Payments (Paystack):** 256-bit encrypted card, USSD, and transfer payments.
3. **24/7 Customer Support:** Dedicated customer assistance via ticketing.
4. **Easy Returns & Refunds:** 7-day hassle-free return policy.
5. **Trusted by Thousands:** Thousands of verified customer deliveries.

### Section 3: Shop by Category
- Live category cards dynamically fetched from `/api/v1/categories`.
- Soft pastel colored cards with category titles, product counts, and smooth hover effects.

### Section 4: Best Sellers Showcase
- Grid of top-performing products fetched from `/api/v1/products/featured`.
- Full product cards featuring real prices, discount tags, review ratings, wishlist toggles, and direct add-to-cart buttons.

### Section 5: Promotional Mid-Page Banner
- High-contrast Deep Navy card highlighting seasonal deals and express delivery perks.

### Section 6: New Arrivals
- Fresh catalog additions fetched from `/api/v1/products/new-arrivals`.

### Section 7: Live Delivery Estimator Widget
- Customer-friendly interactive calculator (`DeliveryEstimatorWidget`) providing immediate shipping rate estimates across all 36 Nigerian states and the FCT based on backend shipping configurations.

### Section 8: Professional Footer
- Deep Navy footer with genuine trust pillars, newsletter signup with toast feedback, customer navigation links, and copyright notices.
