# Product Search Engine

## 1. Search Strategy & Engine Choice

Cartiva Mini implements a native MongoDB search strategy engineered to run efficiently on any standard MongoDB instance (local community server, replica set, or cloud cluster) without external infrastructure overhead.

### Full-Text Search Index

The `products` collection maintains a weighted compound text index:

```typescript
productSchema.index(
  {
    title: 'text',
    shortDescription: 'text',
    brand: 'text',
    tags: 'text',
  },
  {
    weights: {
      title: 10,
      brand: 5,
      tags: 3,
      shortDescription: 1,
    },
    name: 'ProductTextSearchIndex',
  }
);
```

### Multi-Tier Relevance Ranking

Relevance sorting (`sort=relevance`) evaluates search results through weighted criteria:

1. **Title / Product Name Matches (Weight 10)**: Highest relevance priority.
2. **Brand Matches (Weight 5)**: Strong secondary priority.
3. **Tags Matches (Weight 3)**: Curated category/feature keyword priority.
4. **Description Matches (Weight 1)**: Body copy and detailed feature matches.
5. **Exact / Prefix SKU Match**: Handled via compound regex fallback so exact product codes match deterministically.

---

## 2. Input Sanitization & ReDoS Protection

All customer search inputs are processed through [`search.util.ts`](file:///c:/Users/USER/OneDrive/Desktop/cartiva-min/backend/src/modules/product/search.util.ts):

```typescript
export const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

export const normalizeSearchQuery = (raw: string, maxLength = 100): string => {
  if (!raw) return '';
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxLength);
};
```

### Protections Enforced:

1. **Regular Expression Denial of Service (ReDoS)**: Special regex characters (e.g. `[.*+?^${}()|[]\`) are escaped before query construction, preventing catastrophic backtracking.
2. **Whitespace Normalization**: Leading, trailing, and duplicate spaces are collapsed into single spaces.
3. **Payload Bounds**: Query length is capped at 100 characters to prevent oversized payload attacks.

---

## 3. Autocomplete & Real-Time Suggestions

The `/api/v1/products/suggestions` endpoint provides instant catalog suggestions across three distinct catalog dimensions:

1. **Matching Products**: Top published products matching query text, projected with title, slug, price, and thumbnail.
2. **Matching Categories**: Active categories matching query text.
3. **Matching Brands**: Distinct brand names found on matching published products.

### Performance Controls:

- **Projection**: Only public display fields are projected (`title`, `slug`, `regularPrice`, `salePrice`, `images`, `brand`, `categoryId`). Sensitive fields like `costPrice` are completely omitted.
- **Strict Limit**: Default 5 suggestions, maximum 15.
- **Short-Circuit**: Queries shorter than 1 character or whitespace-only return empty suggestion payloads immediately.
- **In-Memory TTL**: Suggestions are cached in memory for 120 seconds with automatic cache key generation.

---

## 4. Public / Private Catalog Separation

The search engine strictly guarantees that customers can only view active, commercially available catalog items:

- Queries enforce `status: ProductStatus.PUBLISHED` at the database level.
- Products in `DRAFT`, `UNPUBLISHED`, or `ARCHIVED` status are never matched or returned.
- When an administrator transitions a product away from `PUBLISHED`, the in-memory search cache is immediately purged, preventing stale cache leaks.
