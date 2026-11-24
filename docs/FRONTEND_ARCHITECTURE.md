# Cartiva Mini — Frontend Architecture (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Architectural Overview

Cartiva Mini uses a modern, lightweight, type-safe Single Page Application (SPA) frontend built on:
- **Framework:** React 18 with TypeScript 5 (Strict Mode enabled).
- **Build Tool:** Vite 5.4 configured with ESM and path aliases (`@/` -> `frontend/src/`, `@shared/` -> `shared/types/`).
- **Component Libraries:** Material UI (MUI v5) and React-Bootstrap for flexible layout primitives and accessible widgets.
- **State Management:**
  - **Zustand:** For local and persistent client UI state (`authStore`, `uiStore`).
  - **TanStack Query (React Query v5):** For server state caching, optimistic updates, request deduplication, and stale-while-revalidate lifecycle management.
- **Routing:** React Router v6 with layout nesting, protected customer routes, and fallback handling.
- **PWA Capabilities:** W3C Web App Manifest (`manifest.json`) and a dedicated Service Worker (`sw.js`) supporting offline asset caching without caching private customer/financial data.

---

## 2. Directory Structure

```
frontend/
├── public/
│   ├── manifest.json         # PWA Web App Manifest
│   ├── sw.js                 # PWA Service Worker (Public asset cache only)
│   └── icons/                # High-res PWA & favicon assets
├── src/
│   ├── components/
│   │   ├── common/           # Header, Footer, ProductCard, CategoryCard, GlobalToast
│   │   ├── shipping/         # DeliveryEstimatorWidget, ShippingOptionCard
│   │   ├── cart/             # CartDrawer, CartItemRow, CartSummaryCard
│   │   └── product/          # ProductGallery, VariantPicker, ReviewSummary
│   ├── hooks/                # TanStack query hooks (useProducts, useCart, useOrders, etc.)
│   ├── layouts/
│   │   ├── RootLayout.tsx    # Customer storefront shell (Header, GlobalToast, Outlet, Footer)
│   │   └── AdminLayout.tsx   # Admin dashboard shell
│   ├── pages/
│   │   ├── HomePage.tsx      # Premium hero, trust pillars, categories, bestsellers
│   │   ├── ShopPage.tsx      # Comprehensive product catalog with multi-facet filters
│   │   ├── SearchPage.tsx    # Dedicated search discovery page with server facets
│   │   ├── ProductDetailPage.tsx # Image gallery, options picker, reviews, related items
│   │   ├── CartPage.tsx      # Server-authoritative cart with coupon validation
│   │   ├── WishlistPage.tsx  # Customer saved items with instant move-to-cart
│   │   ├── CheckoutPage.tsx  # Multi-step checkout with server financial calculations
│   │   ├── OrderSuccessPage.tsx # Post-payment confirmation and Paystack status check
│   │   ├── auth/             # Login, Register, ForgotPassword, ResetPassword, VerifyEmail
│   │   └── account/          # Overview, Profile, Addresses, Security, Support
│   ├── services/             # Axios API client modules wrapping backend REST endpoints
│   ├── stores/               # Zustand state stores (authStore, uiStore)
│   ├── styles/               # MUI Theme tokens, design constants, and index.css
│   └── routes/               # Centralized React Router route map
```

---

## 3. Communication Patterns with Backend

All customer-facing requests interface with the backend via the centralized `apiClient` (`frontend/src/services/api.ts`):
- **Base URL:** `/api/v1`
- **Security:** Automatic Bearer token attachment via `authStore` with HttpOnly refresh token rotation on 401 response interceptors.
- **CSRF & Header Protection:** Standard `X-Requested-With` and JSON content negotiation headers.
- **Error Normalization:** Standard `ApiResponse<T>` contract guarantees server errors are handled cleanly and transformed into user-friendly notifications via `GlobalToast`.

---

## 4. State Management Boundaries

| Store / Hook | Responsibility | Persistence |
|---|---|---|
| `authStore` | Current customer session, JWT tokens, user metadata | `localStorage` |
| `uiStore` | Global in-app toast, theme mode (light/dark), cart drawer state | `localStorage` (theme) / In-memory (transient) |
| `useCart` / `useWishlist` | Synchronized shopping cart & wishlist state | TanStack Query Cache + Backend Database |
| `useProducts` / `useProductSearch` | Catalog discovery, categories, facets | TanStack Query Cache (5-minute stale time) |
| `useMyOrders` / `useOrderDetail` | Real-time customer order history and timeline | TanStack Query Cache |
