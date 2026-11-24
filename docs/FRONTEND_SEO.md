# Cartiva Mini — Frontend SEO & Public Storefront Optimization (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Search Engine Optimization (SEO) Architecture

Cartiva Mini implements comprehensive storefront metadata and structured data to ensure high discoverability on major search engines:

### Meta Elements in `frontend/index.html`:
- **Document Title:** `Cartiva Mini — Everything You Need, Just a Click Away.`
- **Meta Description:** "Discover amazing products, unbeatable prices and fast nationwide delivery with Cartiva Mini. Shop electronics, fashion, home essentials and more."
- **Keywords:** `online shopping nigeria, e-commerce lagos, buy electronics, cartiva mini, nationwide delivery`
- **Theme Color:** `#101D3B`
- **Mobile Viewport:** `width=device-width, initial-scale=1.0, maximum-scale=5.0`

---

## 2. Social Sharing & OpenGraph Tags

- `og:type` = `website`
- `og:site_name` = `Cartiva Mini`
- `og:title` = `Cartiva Mini — Premium Online Store`
- `og:description` = `Everything You Need, Just a Click Away.`
- `twitter:card` = `summary_large_image`

---

## 3. Privacy & Indexing Boundaries

- Public pages (`/`, `/shop`, `/products/:slug`, `/search`, `/about`, `/contact`, `/support`) are indexable with descriptive titles and alt-text on images.
- Private customer pages (`/account/*`, `/checkout`, `/orders/*`, `/cart`) have `noindex, nofollow` headers and guards to prevent search crawler exposure of sensitive customer data.
