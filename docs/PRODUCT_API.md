# Cartiva Mini — Product & Category API Specification

## 1. Overview

Cartiva Mini exposes high-performance RESTful APIs for catalog discovery (public customer endpoints) and catalog management (protected administrator endpoints).

All JSON responses follow the standardized Cartiva Mini envelopes:

- **Success:** `{ "success": true, "data": ..., "message": "...", "meta": { ... } }`
- **Error:** `{ "success": false, "error": { "code": "...", "message": "...", "details": [...], "timestamp": "...", "requestId": "..." } }`

---

## 2. Public Catalog APIs

Public endpoints are unauthenticated and automatically filter out non-published products (`status: published`) and inactive categories (`isActive: true`).

### Categories

- `GET /api/v1/categories` — Retrieve full hierarchical taxonomy tree of active categories and subcategories.
- `GET /api/v1/categories/:slug` — Retrieve single category details by slug.
- `GET /api/v1/categories/:slug/products` — Retrieve paginated products belonging to category.

### Products

- `GET /api/v1/products` — Retrieve paginated product catalog with database filtering:
  - Query parameters:
    - `page` (default: 1)
    - `limit` (default: 20, max: 100)
    - `category` (Category ObjectId)
    - `subCategory` (Subcategory ObjectId)
    - `brand` (case-insensitive regex)
    - `minPrice` (numeric)
    - `maxPrice` (numeric)
    - `featured` (boolean)
    - `sort` (`newest`, `price-low-to-high`, `price-high-to-low`, `rating`, `popular`)
- `GET /api/v1/products/featured` — Retrieve curated featured products (`limit`, default: 8).
- `GET /api/v1/products/:slug` — Retrieve detailed published product by slug. Returns 404 for drafts or non-existent items.
- `GET /api/v1/products/:slug/related` — Retrieve related published products in the same category (`limit`, default: 4).

---

## 3. Administrative Catalog APIs

Protected by `authenticate` and `requireRole(UserRole.ADMIN)`.

### Category Administration

- `POST /api/v1/admin/categories` — Create category (validates slug, parent, and display order).
- `GET /api/v1/admin/categories` — List all categories including inactive ones.
- `GET /api/v1/admin/categories/:categoryId` — Retrieve category by ID.
- `PATCH /api/v1/admin/categories/:categoryId` — Update category fields (prevents circular dependencies and self-parenting).
- `DELETE /api/v1/admin/categories/:categoryId` — Delete category (fails if active products are assigned).
- `PATCH /api/v1/admin/categories/:categoryId/status` — Toggle active/inactive status.

### Product Administration

- `POST /api/v1/admin/products` — Create product (validates pricing, generates or validates slug, verifies SKU uniqueness).
- `GET /api/v1/admin/products` — Admin paginated product list supporting all statuses (`draft`, `published`, `archived`, `unpublished`).
- `GET /api/v1/admin/products/:productId` — Retrieve product by ID including cost price and audit data.
- `PATCH /api/v1/admin/products/:productId` — Update product details, pricing, variants, and SEO.
- `DELETE /api/v1/admin/products/:productId` — Soft delete / archive product (`status: archived`).
- `PATCH /api/v1/admin/products/:productId/status` — Transition product status (`draft` <-> `published` <-> `unpublished` <-> `archived`).

### Product Image Management

- `POST /api/v1/admin/products/:productId/images` — Upload product image via multipart `FormData` (`image` field). Enforces magic bytes verification, size limit (5MB), and auto-thumbnail assignment.
- `DELETE /api/v1/admin/products/:productId/images/:imageId` — Delete image from gallery (deletes local file or Cloudinary resource; promotes first remaining image to thumbnail if deleted image was thumbnail).
- `PATCH /api/v1/admin/products/:productId/images/primary` — Set primary thumbnail image (`{ "publicId": "..." }`).
