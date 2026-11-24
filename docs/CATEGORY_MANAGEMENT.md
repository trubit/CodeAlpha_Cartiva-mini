# Cartiva Mini — Category Management Architecture

## 1. Overview

The Category Management system structures Cartiva Mini's product inventory into a hierarchical, searchable taxonomy. It supports parent-child category relationships, display ordering, slug uniqueness, and strict referential integrity protections.

---

## 2. Category Data Model

The Category model is defined in `Category.model.ts` and validated via Zod in `product.validator.ts`.

| Field          | Type     | Description                                                                             |
| -------------- | -------- | --------------------------------------------------------------------------------------- |
| `name`         | String   | Human-readable name (2–100 chars). Unique index enforced.                               |
| `slug`         | String   | Kebab-case URL identifier (auto-slugified or manual). Unique index.                     |
| `description`  | String   | Editorial and SEO description (up to 500 chars).                                        |
| `image`        | String   | Banner or icon image URL.                                                               |
| `parentId`     | ObjectId | Optional self-reference pointing to the parent `Category`. Root categories have `null`. |
| `displayOrder` | Number   | Sorting sequence integer (default: 0).                                                  |
| `isActive`     | Boolean  | Visibility toggle (default: true). Inactive categories are hidden from public.          |
| `seo`          | Object   | `metaTitle`, `metaDescription`, `keywords`.                                             |
| `createdBy`    | ObjectId | Admin who created the category.                                                         |
| `updatedBy`    | ObjectId | Admin who last updated the category.                                                    |

---

## 3. Referential Integrity & Hierarchy Safeguards

To prevent catalog corruption, the backend enforces three database-level validation rules:

### 1. Self-Parenting Prevention

A category cannot select itself as its `parentId`.

```ts
if (newParentId === categoryId) {
  throw AppError.badRequest(
    'A category cannot be its own parent category.',
    ErrorCodes.CIRCULAR_CATEGORY_DEPENDENCY
  );
}
```

### 2. Circular Relationship Detection (Cycle Prevention)

Setting category A's parent to category B is forbidden if B is already a descendant of A (which would create an infinite tree loop: A -> B -> A).
The service performs an upward traversal from candidate parent to root:

```ts
let current: CategoryDocument | null = await Category.findById(candidateParentId);
while (current && current.parentId) {
  if (current.parentId.toString() === categoryId) {
    return true; // Circular loop detected!
  }
  current = await Category.findById(current.parentId);
}
```

### 3. Deletion Protection (Orphan Prevention)

A category cannot be deleted if active products are assigned to it.

```ts
const productCount = await Product.countDocuments({ categoryId });
if (productCount > 0) {
  throw AppError.badRequest(
    `Cannot delete category containing ${productCount} active product(s). Please reassign or archive products first.`,
    ErrorCodes.CATEGORY_HAS_PRODUCTS
  );
}
```

---

## 4. Public vs Administrative Taxonomy

- **Public Endpoint (`GET /api/v1/categories`):**
  Returns only `isActive: true` categories, structured as a nested tree where root categories embed their active subcategories in a `children` array.
- **Admin Endpoint (`GET /api/v1/admin/categories`):**
  Returns all categories (both active and inactive) with flat sorting by `displayOrder` and `name` for catalog configuration.
