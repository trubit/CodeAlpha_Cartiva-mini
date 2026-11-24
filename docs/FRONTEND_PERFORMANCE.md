# Cartiva Mini — Frontend Performance & Optimization (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Performance Strategy & Low-Data Optimization

Cartiva Mini is optimized to deliver high-speed, smooth browsing experiences even on slower mobile networks (3G/4G) and constrained data plans:

### Key Optimizations:
1. **Lazy Loading & Responsive Media:**
   - Product images and lifestyle banners use `loading="lazy"` attribute.
   - Specific dimensions (`width` and `height` ratios) prevent Cumulative Layout Shift (CLS).
2. **Debounced Search Inputs:**
   - Search autocomplete uses a 280ms debounce with cancellation of stale inflight requests, minimizing unnecessary backend load.
3. **TanStack Query Caching:**
   - Public product catalogs and category hierarchies maintain a 5-minute stale-time (`staleTime: 1000 * 60 * 5`).
   - Customer orders and cart state use targeted cache invalidation (`invalidateQueries`) upon mutations.
4. **Vite Production Bundling & Code Splitting:**
   - Rollup chunk splitting separates vendor frameworks (`ui` chunk for MUI and React-Bootstrap; `vendor` chunk for React, React Router, TanStack Query).
   - Clean production bundle (`npm run build:frontend`) results in 32 kB gzip CSS and fast initial hydration.
5. **Zero Duplicate API Calls:**
   - Centralized QueryClient deduplicates simultaneous data requests across page components.
