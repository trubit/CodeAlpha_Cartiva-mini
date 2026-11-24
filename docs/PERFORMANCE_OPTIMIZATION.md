# Performance Optimization Report — Cartiva Mini

**Project:** Cartiva Mini  
**Phase:** 18 (Performance & Optimization)  
**Status:** Implemented & Verified  

---

## 1. Frontend Bundle Optimization & Code Splitting

Prior to Phase 18, all application routes and administrative portal views were bundled into a single monolithic bundle:

- **Monolithic Bundle (Before):** `index.js` — **1,261.21 kB** (201.5 kB gzip)
- **Code-Split Bundle (Phase 18):** `index.js` — **356.57 kB** (79.24 kB gzip)
- **Net Reduction:** **71.7% decrease in initial download footprint!**

### Modular Route Chunks Generated:
- `ShopPage`: 19.48 kB
- `ProductDetailPage`: 39.09 kB
- `CartPage`: 22.43 kB
- `CheckoutPage`: 145.31 kB (downloaded only during checkout)
- `AdminDashboardPage`: 170.44 kB (downloaded only by staff/admin)
- `AdminFulfilmentPage`: 71.67 kB (downloaded only by staff/admin)
- `AdminPaymentsPage`: 35.87 kB (downloaded only by staff/admin)
- `OrdersPage`: 16.52 kB
- `AboutPage`: 11.21 kB
- `LoginPage`: 7.47 kB

---

## 2. Core Web Vitals & Asset Delivery

1. **Largest Contentful Paint (LCP):**
   - The hero background image in `HomePage.tsx` was optimized to use responsive modern dimensions (`w=1440&q=75&fm=webp`), with `loading="eager"` and high fetch priority.
2. **Client-Side Cache Strategy:**
   - Public categories: `staleTime: 10 minutes`
   - Featured products & new arrivals: `staleTime: 5 minutes`
   - Product search suggestions: `staleTime: 1 minute`
   - Eliminates redundant network waterfalls when navigating between Storefront, Product Detail, and Home.
3. **Non-Blocking Session Check:**
   - Replaced blocking loading states with non-blocking 1500ms silent session checks, preventing infinite spinner locks.

---

## 3. Backend & Database Query Optimization

1. **Compound Indexes:**
   - Orders: `{ userId: 1, createdAt: -1 }` and `{ orderStatus: 1, paymentStatus: 1, createdAt: -1 }`
   - Products: `{ categoryId: 1, status: 1, regularPrice: 1 }` and `{ status: 1, createdAt: -1 }`
   - Notifications: `{ recipientId: 1, isRead: 1, createdAt: -1 }`
2. **Projection Filtering:**
   - Admin KPI analytics use MongoDB `$facet` aggregation pipelines, computing counts and revenue in a single database roundtrip.
3. **Sensitive Field Elimination:**
   - Products strip `costPrice` on JSON transformation to prevent wholesale margin leakage to clients.

