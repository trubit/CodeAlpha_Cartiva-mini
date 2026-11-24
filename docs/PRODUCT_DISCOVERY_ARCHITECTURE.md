# Product Discovery Architecture

## 1. Overview

Cartiva Mini's Product Discovery & Search Engine (Phase 9) delivers low-latency, relevant, and privacy-conscious catalog discovery for shoppers across web and mobile interfaces. The architecture is built natively on MongoDB and Node.js/Express, eliminating the cost, deployment overhead, and data synchronization drift of external search engines like Elasticsearch or Algolia.

```mermaid
graph TD
    Client[Customer / Frontend App] -->|HTTP GET Request| Router[Express API Router]
    Router --> Val[Zod Request Validation]
    Val --> CacheCheck{In-Memory Cache Hit?}

    CacheCheck -- Yes --> CachedResp[Return Cached DTO]
    CacheCheck -- No --> Svc[Product Service]

    Svc --> Repo[Product Repository]
    Repo --> TextIdx[MongoDB Full-Text Search Index]
    Repo --> CompIdx[Compound Filter & Sort Indexes]
    Repo --> AggPipe[MongoDB Facet Aggregation Pipeline]

    Repo --> CacheStore[Store Result in SearchCacheService]
    Svc -.->|Async Fire-and-Forget| Analytics[SearchAnalytics Model (TTL 90d)]

    CacheStore --> Resp[Format & Return Public DTO]
```

---

## 2. Architectural Principles

1. **Native Database Search**:
   Utilizes MongoDB compound text indexes (`ProductTextSearchIndex`) with custom field weights (`title: 10`, `brand: 5`, `tags: 3`, `shortDescription: 1`) combined with prefix and token matching for SKUs and brands.
2. **Zero Overselling / Real Stock Availability**:
   Availability filtering (`in_stock` vs `out_of_stock`) directly evaluates the Phase 8 atomic stock formula:
   $$\text{Available Stock} = \max(0, \text{stockQuantity} - \text{reservedQuantity})$$
   Calculated at database lock-time, ensuring customers never discover or purchase phantom inventory.
3. **In-Memory TTL Caching**:
   Dedicated `SearchCacheService` with automatic TTLs (60s for search, 120s for autocomplete, 300s for category tree) and immediate prefix-based cache invalidation upon any product or category write.
4. **Privacy-Conscious Analytics**:
   Search queries are recorded asynchronously in a separate collection (`search_analytics`) with IP anonymization (truncating last octet) and a 90-day MongoDB TTL index for automatic retention purging.
5. **Deterministic Pagination**:
   Every query applies a secondary sort on `_id` to prevent duplicate or skipped items across pagination boundaries.

---

## 3. Data Flow

### A. Product Search Flow (`/api/v1/products/search`)

1. Client submits search string (`q`) alongside optional filters (category, brand, price range, availability, sort).
2. `productSearchSchema` sanitizes and bounds query parameters (min 1, max 100 characters, `maxPrice >= minPrice`).
3. Search cache key is derived from normalized parameters. If found in `SearchCacheService`, response is served in sub-millisecond time.
4. On cache miss, MongoDB executes:
   - Match filter with `$text` search and structured constraints.
   - Text score projection (`{ score: { $meta: 'textScore' } }`).
   - Facet aggregation pipeline generating category counts, brand counts, price range, and availability stats.
5. Response is stored in cache with 60s TTL.
6. Asynchronous job inserts search term into `SearchAnalytics` without delaying the HTTP response.

### B. Category Browsing Flow (`/api/v1/categories/:slug/products`)

1. Client browses a top-level category (e.g. `fashion-apparel`).
2. `categoryService.getCategoryWithDescendantIds(slug)` resolves the category and queries all active child subcategories.
3. Submits `$in: [categoryId, ...descendantCategoryIds]` to `productRepository.findPublicProducts()`.
4. Returns all products belonging to the parent category and any of its child subcategories with consistent filtering and sorting.
