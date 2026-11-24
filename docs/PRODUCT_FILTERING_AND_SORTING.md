# Product Filtering and Sorting Architecture

## 1. Overview

Cartiva Mini implements a robust, database-driven filtering and sorting engine for public product discovery and administrative catalog queries. Filtering and sorting operate at the MongoDB database level with compound index support, ensuring sub-second response times, predictable query plans, and strict data isolation (only active, published products are accessible to public consumers).

---

## 2. Supported Filters

### 2.1 Category & Subcategory Hierarchy

- **Parameter:** `category` (Mongo ObjectId) or `categorySlug` (slug string).
- **Hierarchical Resolution:** When filtering by a parent category, the system recursively resolves all active descendant subcategory IDs (`getCategoryWithDescendantIds`) and executes an `$in: [parentId, ...descendantIds]` query.
- **Safety:** Unpublished products and products in archived/inactive categories are excluded from public discovery.

### 2.2 Price Range & Currency

- **Parameters:** `minPrice` (number, $\ge 0$), `maxPrice` (number, $\ge 0$), `currency` (3-letter uppercase ISO code).
- **Validation:** Zod validator `productQuerySchema` strictly enforces `maxPrice >= minPrice` (producing HTTP 422 if violated).
- **Database Query:** Query maps to `{ regularPrice: { $gte: minPrice, $lte: maxPrice }, currency }`.

### 2.3 Brand Filtering

- **Parameter:** `brand` (string, 1–100 characters).
- **Query Strategy:** Evaluated via indexed exact or safely escaped regex match (`escapeRegex(brand)`) to prevent ReDoS attacks while supporting case-insensitive matching.

### 2.4 Attribute Filtering

- **Parameter:** `attributes` (Record<string, string>).
- **Query Strategy:** Maps to `{ 'attributes.name': key, 'attributes.value': value }`.
- **Flexibility:** Allows filtering by dynamic attributes (e.g., color, size, material) without schema changes.

### 2.5 Real-Time Inventory Stock Availability Filter

- **Parameter:** `availability` (`all` | `in_stock` | `out_of_stock`).
- **Phase 8 Atomic Inventory Integration:** Availability is evaluated directly against the atomic stock formula:
  $$\text{Available Stock} = \text{stockQuantity} - \text{reservedQuantity}$$
- **Database Execution:**
  - `in_stock`:
    ```javascript
    {
      $expr: {
        $gt: [
          {
            $subtract: [{ $ifNull: ['$stockQuantity', 0] }, { $ifNull: ['$reservedQuantity', 0] }],
          },
          0,
        ];
      }
    }
    ```
  - `out_of_stock`:
    ```javascript
    {
      $expr: {
        $lte: [
          {
            $subtract: [{ $ifNull: ['$stockQuantity', 0] }, { $ifNull: ['$reservedQuantity', 0] }],
          },
          0,
        ];
      }
    }
    ```
- **Integrity Guarantee:** Never exposes internal warehouse quantities or audit records to public customers; returns solely binary/calculated boolean status.

---

## 3. Supported Sorting Options

The sort engine supports standard, deterministic sort keys defined in `ProductSortOption` (`shared/types/enums.ts`):

| Sort Option  | Field & Direction                    | Deterministic Secondary Tie-Breaker | Use Case                          |
| ------------ | ------------------------------------ | ----------------------------------- | --------------------------------- |
| `relevance`  | `{ score: { $meta: 'textScore' } }`  | `{ _id: -1 }`                       | Text search default ranking       |
| `newest`     | `{ createdAt: -1 }`                  | `{ _id: -1 }`                       | Fresh catalog browsing            |
| `oldest`     | `{ createdAt: 1 }`                   | `{ _id: 1 }`                        | Administrative archiving/ordering |
| `price_asc`  | `{ regularPrice: 1 }`                | `{ _id: 1 }`                        | Budget-conscious discovery        |
| `price_desc` | `{ regularPrice: -1 }`               | `{ _id: -1 }`                       | Premium product discovery         |
| `name_asc`   | `{ title: 1 }`                       | `{ _id: 1 }`                        | Alphabetical catalog list         |
| `name_desc`  | `{ title: -1 }`                      | `{ _id: -1 }`                       | Reverse alphabetical list         |
| `rating`     | `{ averageRating: -1 }`              | `{ _id: -1 }`                       | Highest rated reviews             |
| `popular`    | `{ totalSales: -1, viewsCount: -1 }` | `{ _id: -1 }`                       | Platform bestsellers              |

### Deterministic Tie-Breaking

Every sort option mandates a secondary tie-breaker on `_id` (`1` or `-1`). This guarantees that pagination boundaries remain stable and prevents items from shifting across pages during concurrent reads.

---

## 4. Pagination & Query Limits

- **Parameters:** `page` (integer, default 1, min 1), `limit` (integer, default 20, max 100).
- **Validation:** Bounded by Zod schema to prevent denial-of-service via massive result requests.
- **Pagination Metadata:**
  ```json
  {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
  ```
- **Memory Protection:** Never loads unpaginated catalog subsets into Node.js process memory.
