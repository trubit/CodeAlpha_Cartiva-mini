# Cartiva Mini — Product Management Architecture

## 1. Overview

Product Management in Cartiva Mini serves as the commercial backbone of the e-commerce catalog. Built for the Nigerian retail landscape with global commerce standards, it provides strict separation between administrative management and customer-facing catalogs, robust identifier integrity (SKUs & slugs), flexible attribute modeling, variant support, and complete lifecycle audit trails.

---

## 2. Product Data Model & Attributes

The primary product entity (`Product.model.ts`) integrates into MongoDB via Mongoose with strict schema validation and TypeScript typings.

### Core Fields

| Field               | Type             | Required | Description                                                                               |
| ------------------- | ---------------- | -------- | ----------------------------------------------------------------------------------------- |
| `title` / `name`    | String           | Yes      | Public and internal product name (2–180 chars). Synchronized via getters/JSON transforms. |
| `slug`              | String           | Yes      | Unique URL kebab-case identifier (auto-generated or sanitized manual entry).              |
| `sku`               | String           | Yes      | Stock Keeping Unit, uppercase unique identifier (2–50 chars).                             |
| `barcode`           | String           | No       | UPC/EAN barcode.                                                                          |
| `brand`             | String           | No       | Brand/manufacturer name.                                                                  |
| `shortDescription`  | String           | Yes      | Concise product summary (5–300 chars) for listing cards and meta previews.                |
| `fullDescription`   | String           | Yes      | Detailed Markdown/HTML product specifications and overview (min 10 chars).                |
| `regularPrice`      | Number           | Yes      | Base selling price in minor or decimal units (> 0).                                       |
| `salePrice`         | Number           | No       | Promotional discount price (<= regularPrice).                                             |
| `saleStartDate`     | Date             | No       | Promotion validity start timestamp.                                                       |
| `saleEndDate`       | Date             | No       | Promotion validity end timestamp (must be strictly after `saleStartDate`).                |
| `costPrice`         | Number           | No       | Internal cost of goods sold. **Hidden from public APIs (`select: false`)**.               |
| `currency`          | String           | Yes      | Default: `NGN`. ISO 4217 3-letter currency code.                                          |
| `categoryId`        | ObjectId         | Yes      | Reference to parent `Category` document.                                                  |
| `subCategoryId`     | ObjectId         | No       | Optional reference to leaf/sub `Category` document.                                       |
| `images`            | Array            | Yes      | Ordered collection of uploaded images with thumbnail marker.                              |
| `attributes`        | Map<String, Any> | No       | Flexible key-value pairs (e.g. `color`, `material`, `storageCapacity`).                   |
| `hasVariants`       | Boolean          | Yes      | Flag indicating whether product possesses variations.                                     |
| `variants`          | Array            | No       | Sub-document array of distinct SKU/price/attribute variants.                              |
| `stockQuantity`     | Number           | Yes      | Current stock counter (prepared for Phase 8 inventory engine).                            |
| `lowStockThreshold` | Number           | Yes      | Inventory alert threshold (default: 5).                                                   |
| `status`            | Enum             | Yes      | Current lifecycle state: `draft`, `published`, `unpublished`, `archived`.                 |
| `featured`          | Boolean          | Yes      | Flag promoting product to home/featured sections.                                         |
| `seo`               | Object           | No       | `metaTitle`, `metaDescription`, `keywords`.                                               |
| `createdBy`         | ObjectId         | Yes      | Admin User reference who created the product.                                             |
| `updatedBy`         | ObjectId         | No       | Admin User reference who last modified the product.                                       |

---

## 3. Product Status Lifecycle & Workflow

Products transition through four explicit states:

```
           [ Create Product ]
                   │
                   ▼
               ┌───────┐
               │ DRAFT │ (Default on creation, visible only to Admins)
               └───┬───┘
                   │
         Publish   │   Unpublish
       ┌───────────┴───────────┐
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│  PUBLISHED  │ ◄─────► │ UNPUBLISHED │ (Hidden from store catalog)
└──────┬──────┘         └──────┬──────┘
       │                       │
       └───────────┬───────────┘
                   │ Archive (Soft Delete)
                   ▼
             ┌──────────┐
             │ ARCHIVED │ (Preserves historical orders; non-purchasable)
             └──────────┘
```

1. **DRAFT:** Initial state for new products during catalog authoring. Only visible on `/api/v1/admin/products`.
2. **PUBLISHED:** Active product accessible through public customer APIs (`/api/v1/products`).
3. **UNPUBLISHED:** Temporarily withdrawn from public view (e.g. seasonal hiatus or pending review).
4. **ARCHIVED:** Soft-deleted. Cannot be purchased; preserved in the database to prevent orphaned records in historical orders and transactions.

---

## 4. SKU, Slug & Historical Reference Management Rules

### 1. System-Wide SKU Uniqueness (Parents & Variations)

- Every SKU in the system (whether defined on a parent product or as an item in `variants[]`) must be unique across the entire catalog.
- Evaluated case-insensitively with uppercase normalization (`OXF-SHT-BLU-M`).
- `Product.model.ts` establishes indexes on both `sku: 1` (unique) and `'variants.sku': 1` (sparse).
- `productRepository.findBySku(sku)` queries both primary and variant SKUs using `{ $or: [{ sku }, { 'variants.sku': sku }] }`, allowing inventory scanners, cart lookups, and order processing to resolve the product and variant in a single query.
- Duplicate variant SKUs within the same product or across different products in the database trigger `409 Conflict` (`DUPLICATE_SKU`).

### 2. URL Preservation via Historical Slug Tracking (`previousSlugs`)

- When an administrator modifies a product title or custom slug, the previous slug is automatically appended to `previousSlugs: [String]`.
- Public endpoint `GET /api/v1/products/:slug` checks `{ $or: [{ slug }, { previousSlugs: slug }] }`.
- External backlinks, search engine indexing (Google/Bing), customer bookmarks, and shared links never encounter 404 dead links when titles or URLs evolve.
- New products cannot claim an existing product's current or historical slug.

### 3. Historical Order & Financial Reference Immutability

- Products are never permanently deleted with `findByIdAndDelete`. Instead, deleting a product invokes `deleteOrArchive` which transitions the state to `status: ProductStatus.ARCHIVED`.
- This ensures historical references in `Cart.items[].productId`, `Order.items[].productId`, `InventoryMovement`, `Payment`, and `Transaction` records remain intact without dangling foreign keys.
- Cart and Order models take complete immutable snapshots (`sku`, `title`, `unitPrice`, `thumbnailUrl`, `variantId`) at checkout time, ensuring future price or catalog edits never retroactively alter historical invoices or financial reports.

---

## 5. Security & Audit Logging

- **Role Guard:** All write operations (`POST`, `PATCH`, `DELETE`) require `authenticate` and `requireRole(UserRole.ADMIN)`.
- **Masking:** Public endpoints project out `costPrice`, internal database version tags (`__v`), and internal notes.
- **Audit Trails:** All modifications (creations, price changes, status updates, image uploads) trigger audit log entries in the `AuditLog` collection, tracking `actorId`, `actorRole`, `action`, `entityId`, `ipAddress`, `userAgent`, and before/after diffs.
