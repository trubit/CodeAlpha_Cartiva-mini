# Cartiva Mini — Admin Product & Inventory Management

## 1. Overview
Reusing the core product catalog (Phase 7) and atomic inventory engine (Phase 8), the administrative interface provides granular control over merchandise, department taxonomy, physical on-hand stock, stock reservations, and stock reconciliation.

## 2. Product Management
- **Catalog Operations:** Create, update, publish, archive, or unpublish products with validation via Zod schemas.
- **Financial Minor Units:** Regular prices and sale prices are stored and managed in integer minor units (kobo) to eliminate IEEE 754 floating-point inaccuracies.
- **Status Lifecycle:** Products transition between `draft`, `published`, and `archived` states. Archived products are excluded from customer storefront search while preserving historical order snapshot relationships.
- **Endpoints:**
  - `GET /api/v1/admin/products`
  - `POST /api/v1/admin/products`
  - `GET /api/v1/admin/products/:productId`
  - `PATCH /api/v1/admin/products/:productId`
  - `PATCH /api/v1/admin/products/:productId/status`

## 3. Department & Category Management
- **Hierarchy & Ordering:** Manage categories and subcategories with configurable `displayOrder` and `isActive` toggles.
- **Integrity Validation:** Prevents deletion of categories linked to active merchandise.
- **Endpoints:**
  - `GET /api/v1/admin/categories`
  - `POST /api/v1/admin/categories`
  - `PATCH /api/v1/admin/categories/:categoryId`

## 4. Atomic Inventory Management
- **Three-Tier Stock Model:**
  - `onHandQuantity`: Total physical items physically residing in the warehouse.
  - `reservedQuantity`: Items locked during customer checkout sessions.
  - `availableQuantity`: `onHandQuantity - reservedQuantity`.
- **Manual Stock Adjustments:** Direct untracked quantity edits are strictly prohibited. Every manual reconciliation must supply:
  - `targetQuantity`: New target stock count.
  - `reason`: Mandatory operational justification (e.g., damaged items, supplier restock, inventory audit).
  - `actor`: Recorded administrator user ID.
- **Inventory Movement Ledger:** Append-only movement records (`InventoryMovement`) track every unit delta with timestamps and operator identity.
- **Endpoints:**
  - `GET /api/v1/admin/inventory`: Overview of stock items.
  - `POST /api/v1/admin/inventory/:id/adjust`: Atomic stock adjustment.
  - `GET /api/v1/admin/inventory/movements`: Historical audit trail of stock transitions.
