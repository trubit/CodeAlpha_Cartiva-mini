# Cartiva Mini — Customer Navigation System (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Global Navigation Architecture

The Cartiva Mini navigation system provides an intuitive, friction-free shopping journey across desktop, tablet, and mobile devices.

### Desktop Navigation Structure
1. **Top Announcement Strip:**
   - Free shipping notification banner (`Free Shipping on orders over ₦50,000`).
   - Direct utility links: `Track Order`, `Customer Support`, and `About Us`.
2. **Main Header Bar:**
   - **Logo & Tagline:** Cartiva Mini brand mark linked to `/`.
   - **Prominent Search Bar:** Debounced live search autocomplete querying `/api/v1/products/suggestions` with direct keyboard submission to `/search?q=...`.
   - **Customer Account Dropdown:**
     - Displays customer first name when authenticated.
     - Quick links to `Account Dashboard`, `My Orders`, `Saved Addresses`, `Security`, and `Sign Out`.
     - Direct `Sign In` / `Register` trigger when unauthenticated.
   - **Wishlist Badge:** Live count indicator linking to `/wishlist`.
   - **Cart Trigger & Badge:** Live item count and total subtotal badge opening the slide-over cart drawer or navigating to `/cart`.
3. **Category & Utility Bar:**
   - **"All Categories" Dropdown Menu:** Displays live categories fetched from `/api/v1/categories`.
   - **Primary Navigation Links:** `Home`, `Shop`, `Deals`, `About`, `Contact`.
   - **Promotional Badge:** Highlighting ongoing deals and limited-time discounts.

---

## 2. Mobile Navigation System

- **Compact Header:** Clean branding with hamburger drawer trigger, search icon, cart count, and account shortcut.
- **Accessible Navigation Drawer:**
  - Full-height side drawer categorizing main navigation, customer account links, and shop categories.
  - Smooth animation transitions with backdrop dismiss.
- **No Overflow Policy:** Responsive viewport constraints ensure no horizontal scrollbars occur across viewport widths from 320px to 2560px.

---

## 3. Route Guard & Permission Enforcement

| Route | Access Level | Unauthenticated Behavior |
|---|---|---|
| `/` | Public | Render Homepage |
| `/shop` | Public | Render Catalog with Filters |
| `/products/:slug` | Public | Render Product Details |
| `/search` | Public | Render Search Results |
| `/cart` | Public / Guest | Render Cart (Guest cart supported) |
| `/wishlist` | Authenticated | Redirect to `/login?redirect=/wishlist` |
| `/checkout` | Authenticated | Redirect to `/login?redirect=/checkout` |
| `/account/*` | Authenticated | Redirect to `/login?redirect=/account` |
| `/orders/:identifier` | Authenticated | Order owner verification enforced |
