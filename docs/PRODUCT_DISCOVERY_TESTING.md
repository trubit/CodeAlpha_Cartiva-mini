# Product Discovery and Search Engine Testing Suite

## 1. Overview

Phase 9 establishes a comprehensive, automated test suite covering all discovery mechanisms: full-text search, autocomplete suggestions, category hierarchies, dynamic filtering, sorting, in-memory caching with invalidation, and privacy-conscious analytics.

All tests run in an isolated in-memory MongoDB environment (`mongodb-memory-server`) via Vitest, ensuring zero side-effects on production or development databases.

---

## 2. Test Suites & Coverage

### 2.1 Full-Text Product Search (`tests/product/product-search.test.ts`)

- **Search by Product Name:** Validates text score relevance ranking.
- **Search by Brand:** Validates brand token matching.
- **Search by SKU:** Validates exact SKU match via fallback regex.
- **Whitespace Normalization:** Confirms excessive spaces and trim rules do not break search.
- **ReDoS Protection:** Asserts regex meta-characters (`.*+?^${}()|[]\\`) do not crash or hang queries.
- **Zero Results:** Validates clean empty array response with valid facet shells.
- **Draft & Archived Exclusion:** Guarantees non-published products are strictly hidden from public searches.
- **Facet Generation:** Asserts category counts, brand counts, price ranges, and stock counts.
- **Search Analytics Persistence:** Asserts non-blocking background query logging with IP anonymization.

### 2.2 Autocomplete & Suggestions (`tests/product/product-suggestions.test.ts`)

- **Multi-Dimensional Results:** Asserts product names, category names, and brand names are returned concurrently.
- **Limit Enforcement:** Verifies suggestion count stays within the requested limit.
- **Draft & Inactive Exclusion:** Asserts draft products and inactive categories are never suggested.
- **Input Validation:** Confirms empty queries and strings exceeding 100 characters return appropriate validation errors.

### 2.3 Category Discovery (`tests/product/category-discovery.test.ts`)

- **Public Active Categories:** Confirms only active categories are listed.
- **Inactive Category Inaccessibility:** Asserts HTTP 404 when querying inactive category slugs.
- **Category Product Navigation:** Validates `GET /api/v1/categories/:slug/products` returns products in the category and all its active subcategories.
- **Category Filter Combination:** Validates price and brand filters scoped within a category.

### 2.4 Filtering and Sorting (`tests/product/product-filtering-sorting.test.ts`)

- **Price Range:** Validates `minPrice` and `maxPrice` boundaries.
- **Price Validation:** Asserts HTTP 422 when `minPrice > maxPrice`.
- **Brand & Attribute Filters:** Asserts exact attribute key-value matches (`Color=Red`).
- **Phase 8 Atomic Inventory Availability:**
  - `availability=in_stock`: Returns only products where `stockQuantity - reservedQuantity > 0`.
  - `availability=out_of_stock`: Returns products where `stockQuantity - reservedQuantity <= 0`.
- **All Sort Modes:** Verifies `price_asc`, `price_desc`, `name_asc`, `name_desc`, `rating`, `popular`, and `newest`.
- **Pagination Integrity:** Confirms page limits, total counts, and page boundary metadata.

### 2.5 Caching & Invalidation (`tests/product/search-caching.test.ts`)

- **Cache Hit Verification:** Validates that repeated search queries return cached responses with sub-millisecond execution.
- **Product Invalidation:** Confirms changing product status to `draft` immediately invalidates search caches.
- **Category Invalidation:** Confirms category modifications purge category caches.
- **TTL Eviction:** Asserts expired cache entries are discarded after their designated TTL.

---

## 3. Running the Test Suites

To execute the Phase 9 test suites:

```bash
# Run all Phase 9 discovery and search tests
npx vitest run tests/product/

# Run individual test suites
npx vitest run tests/product/product-search.test.ts
npx vitest run tests/product/product-suggestions.test.ts
npx vitest run tests/product/category-discovery.test.ts
npx vitest run tests/product/product-filtering-sorting.test.ts
npx vitest run tests/product/search-caching.test.ts
```
