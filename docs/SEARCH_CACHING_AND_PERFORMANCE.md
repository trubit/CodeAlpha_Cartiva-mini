# Search Caching and Performance Architecture

## 1. Overview

High throughput and low response latency are essential for e-commerce discovery. Cartiva Mini employs a high-performance in-memory LRU/TTL cache tier paired with targeted MongoDB compound indexes. This avoids external dependencies such as Redis while ensuring sub-millisecond cache hit responses and reliable invalidation upon catalog modifications.

---

## 2. In-Memory Cache Service (`SearchCacheService`)

### 2.1 Cache Architecture

- **Implementation:** Built upon a standard Node.js in-memory Map with active TTL checks and maximum capacity bounds (LRU eviction upon reaching 1,000 entries).
- **Zero Third-Party Process Requirement:** Requires no external Redis daemon, eliminating operational overhead and network latency.
- **Key Prefixing & Separation:**
  - `prod:public:` — Filtered catalog lists.
  - `prod:search:` — Full-text keyword search and facet summaries.
  - `prod:sugg:` — Autocomplete suggestions.
  - `prod:featured:` — Featured products carousel.
  - `prod:new:` — New arrivals feed.
  - `cat:public:` — Category hierarchy trees.
  - `cat:slug:` — Category details and descendant maps.

### 2.2 TTL Hierarchy

| Data Type               | Cache Key Pattern                | TTL (Seconds) | Rationale                                   |
| ----------------------- | -------------------------------- | ------------- | ------------------------------------------- |
| Category Trees          | `cat:public:tree`                | 300s (5 min)  | Categories rarely change; high read volume  |
| Category Slug Details   | `cat:slug:*`                     | 300s (5 min)  | Stable category metadata                    |
| Featured Products       | `prod:featured:*`                | 300s (5 min)  | Curated homepage showcase                   |
| New Arrivals            | `prod:new:*`                     | 180s (3 min)  | Periodic product launches                   |
| Search Suggestions      | `prod:sugg:*`                    | 120s (2 min)  | High keystroke volume autocomplete          |
| Search & Filter Queries | `prod:search:*`, `prod:public:*` | 60s (1 min)   | Balances query load with inventory accuracy |

---

## 3. Cache Invalidation Mechanics

To prevent stale or unpublished products from remaining visible to customers, Cartiva Mini triggers immediate prefix-based invalidation upon any catalog mutation:

### 3.1 Product Mutations

When any of the following service actions occur:

- `createProduct`
- `updateProduct`
- `updateProductStatus` (e.g. unpublishing or archiving)
- `deleteOrArchiveProduct`
- `uploadProductImage` / `removeProductImage` / `setPrimaryProductImage`

The service executes:

```typescript
searchCacheService.invalidateProductCaches();
```

This evicts all entries prefixed with `prod:`, ensuring newly unpublished items disappear from public discovery immediately.

### 3.2 Category Mutations

When `createCategory`, `updateCategory`, `updateCategoryStatus`, or `deleteCategory` executes, the service calls:

```typescript
searchCacheService.invalidateCategoryCaches();
```

This purges all `cat:` cached trees and slugs.

---

## 4. Database Indexing & Query Optimization

### 4.1 Product Collection Indexes

1. **Full-Text Search Index (`ProductTextSearchIndex`):**
   - Fields: `{ title: 'text', brand: 'text', tags: 'text', shortDescription: 'text' }`
   - Weights: `title: 10`, `brand: 5`, `tags: 3`, `shortDescription: 1`
   - Default Language: English
2. **Compound Filter Indexes:**
   - `{ status: 1, createdAt: -1 }`: Optimizes default public sorting (`newest`) and new arrivals.
   - `{ status: 1, regularPrice: 1 }`: Optimizes price ascending filter and sort.
   - `{ status: 1, regularPrice: -1 }`: Optimizes price descending sort.
   - `{ status: 1, brand: 1, regularPrice: 1 }`: Optimizes brand and price compound filters.
   - `{ slug: 1 }`: Unique index for instant direct slug lookups.

### 4.2 Single Aggregation Facet Pipeline

Rather than firing 4 distinct database queries to compute filter counts (categories, brands, price extremes, stock counts), `searchProducts` executes a single `$facet` aggregation pipeline. This reduces database round-trips from 4 to 1 and keeps execution times under 30ms on production-sized catalogs.
