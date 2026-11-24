# Cartiva Mini — Progressive Web App (PWA) Implementation (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Overview & Strategy

Cartiva Mini is configured as an installable Progressive Web App (PWA) meeting modern Chromium and WebKit PWA standards while adhering to strict financial data safety guidelines:
- **Manifest File:** `frontend/public/manifest.json`
- **Service Worker:** `frontend/public/sw.js`
- **Registration:** Automatically registered on `window.onload` via `frontend/index.html`.

---

## 2. Web App Manifest Details

```json
{
  "name": "Cartiva Mini — Premium Online Store",
  "short_name": "Cartiva Mini",
  "description": "Everything You Need, Just a Click Away.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F5F7FC",
  "theme_color": "#101D3B",
  "orientation": "portrait-primary",
  "icons": [...]
}
```

---

## 3. Service Worker Caching Policy & Security Constraints

The Service Worker (`sw.js`) enforces strict boundaries to preserve financial integrity:
1. **Public Static Asset Cache (`cartiva-static-v1`):**
   - HTML shell (`/index.html`).
   - CSS bundles, JS bundles, WebP/SVG logos, and font files.
   - Cache-first strategy for immutable hashed assets.
2. **Network-First Public Catalog Requests:**
   - Public product suggestions and category lists use a network-first with cache fallback strategy.
3. **STRICT BYPASS (Never Cached):**
   - Authentication endpoints (`/api/v1/auth/*`).
   - Customer account data (`/api/v1/users/*`).
   - Active carts & coupons (`/api/v1/cart/*`, `/api/v1/coupons/*`).
   - Checkout sessions & payments (`/api/v1/checkout/*`, `/api/v1/payments/*`).
   - Private orders (`/api/v1/orders/*`).
4. **Offline Handling:**
   - Clean offline fallback behavior for static assets without fabricating stale checkout or account data.
