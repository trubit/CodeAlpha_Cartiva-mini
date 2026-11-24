# Cartiva Mini — Homepage Complete Visual Redesign

## 1. Overview & Objectives

In accordance with Phase 11 requirements and visual direction provided via the reference screenshots, the Cartiva Mini landing page (`frontend/src/pages/HomePage.tsx`), main navigation header (`frontend/src/components/common/Header.tsx`), and footer (`frontend/src/components/common/Footer.tsx`) have been completely redesigned.

The redesign achieves a modern, luxury e-commerce aesthetic comparable to leading international brands, while preserving core brand identity, live backend integrations, and the official tagline:

> _"Everything You Need, Just a Click Away."_

---

## 2. Section-by-Section Implementation

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Navigation Header (Logo, Brand Tagline, Cart/Wishlist)  │
├─────────────────────────────────────────────────────────────┤
│ 2. Aurel-Inspired Luxury Hero Section                       │
│    - Editorial Headline ("Designed for Modern Living")      │
│    - Primary CTA ("Explore Collection →")                   │
│    - Floating Frosted Glass Product Preview Cards           │
│    - Bottom Dock of Category Pills                          │
├─────────────────────────────────────────────────────────────┤
│ 3. Shopping Benefits & Trust Strip (Free Shipping, Paystack)│
├─────────────────────────────────────────────────────────────┤
│ 4. Departments Bento Grid (Electronics, Fashion, Home)     │
├─────────────────────────────────────────────────────────────┤
│ 5. Curated Products Showcase (Live Backend Data, Cart/Wish)│
├─────────────────────────────────────────────────────────────┤
│ 6. Interactive Delivery Estimator Widget (Live Rates)       │
├─────────────────────────────────────────────────────────────┤
│ 7. Memento Mori Luxury Minimalist Footer                    │
│    - Customer Care & Concierge Info                         │
│    - Newsletter Subscription Form                           │
│    - Verified Payment Badges (Visa, Mastercard, Paystack)   │
└─────────────────────────────────────────────────────────────┘
```

---

### Section 1: Navigation Header (`Header.tsx`)

- **Visual Style:** Clean, high-contrast white sticky navigation bar with a subtle hairline bottom border.
- **Brand Identity:** Bold `Cartiva Mini` logo with the preserved brand motto: _"Everything You Need, Just a Click Away."_
- **Interactive Badges:**
  - Live Cart count pill (connected directly to Phase 10 `useCart` hook).
  - Live Wishlist count pill (connected to Phase 10 `useWishlist` hook).
  - Customer Delivery Address trigger button (`AddressSelectorModal`).
  - Admin Shipping configuration modal trigger button (conditionally rendered only for `UserRole.ADMIN`).
- **Mobile Experience:** Slide-out responsive drawer navigation for phone viewports.

---

### Section 2: Hero Section (Aurel Luxury Fashion Inspiration)

- **Imagery:** Edge-to-edge full-bleed photography showcasing authentic modern lifestyle apparel and home aesthetics.
- **Copywriting:** High-impact editorial headline:
  $$\text{"Designed for } \textit{Modern Living}\text{"}$$
  with warm terracotta italic accents, supported by concise brand copy:
  _"Timeless pieces. Premium materials. Effortless style delivered directly to your doorstep across Nigeria and beyond."_
- **Floating Product Preview Cards:**
  - Frosted glass cards (`glass-panel-light` and `glass-panel-dark`) hovering over the hero image displaying real backend product highlights (e.g. Silk Pillowcases, Heavy Cast Iron Kettles).
  - Includes real thumbnail image, live price badge, and interactive link to product details.
- **Department Dock:**
  - Sleek dark floating pill dock at the base of the hero (`glass-panel-dark`).
  - Allows customers to filter or jump directly to New Arrivals, Women, Men, and Accessories.

---

### Section 3: Trust & Shopping Benefits Strip

Inspired by modern trust presentation standards:

1. **Free Delivery:** _"On qualifying orders above ₦50,000 nationwide."_
2. **100% Authentic Quality:** _"Hand-inspected, premium verified items only."_
3. **7-Day Doorstep Returns:** _"Hassle-free exchange & refund guarantee."_
4. **Bank-Grade Checkout:** _"Secured by Paystack 256-bit SSL encryption."_

---

### Section 4: Departments Bento Grid

Inspired by the editorial department showcase:

- **Hero Bento Tile (Left, Span 7):** Highlighted showcase for Electronics & Audio (_"Pinnacle of Engineering & Sound"_).
- **Stacked Bento Tiles (Right, Span 5):**
  - Fashion & Apparel (_"Curated Silhouettes & Tailored Essentials"_).
  - Home Sanctuary & Living (_"Artisanal Ceramics & Warm Interiors"_).
- **Wide Bottom Bento Tile:** Everyday Curations & Accessories (_"Finishing Touches"_).

---

### Section 5: Real Product Catalog Showcase

- **Real Backend Data:** Connected via `useProducts` hook to `GET /api/v1/products`.
- **Card Aesthetics:**
  - 1:1 square aspect ratio image container with subtle hover zoom effect (`transform: scale(1.05)`).
  - Authentic product title, brand name, and stock status.
  - Correct pricing hierarchy: active sale price in bold terracotta with strikethrough regular price and percentage discount badge.
- **Direct Interactive Actions:**
  - "Add to Cart" button triggers `cartService.addItem` with loading spinner.
  - "Save to Wishlist" heart button triggers `wishlistService.addToWishlist`.
- **Zero Fake Reviews:** No synthetic star ratings or invented customer testimonials.

---

### Section 6: Interactive Delivery Estimator Widget

- Embedded directly into the homepage experience.
- Shoppers can select any Nigerian state (e.g. Lagos, FCT - Abuja, Rivers, Kano) to view real-time shipping options, estimated transit days, and calculated fees before beginning checkout.

---

### Section 7: Memento Mori Minimalist Luxury Footer (`Footer.tsx`)

Inspired by the dark editorial footer design:

- **Palette:** Rich midnight slate `#0a0d14` background with crisp white typography.
- **Newsletter Subscription:** Minimalist inline email input with arrow submission button (`→`).
- **Customer Care & Concierge:** Direct links to Shipping & Delivery Policy, Returns & Refunds, Terms of Sale, and Privacy.
- **Payment Verification Badges:** Crisp visual badges for Visa, Mastercard, Apple Pay, Google Pay, and Paystack.
- **Copyright & Tagline:** Reaffirms Cartiva Mini's registered trademark and brand identity.
