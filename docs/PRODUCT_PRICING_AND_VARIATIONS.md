# Cartiva Mini — Product Pricing & Variations Architecture

## 1. Overview

Product pricing and variation management provides mathematical precision and flexibility for multi-SKU product offerings without introducing floating-point calculation anomalies or premature inventory logic.

---

## 2. Pricing Architecture & Validation Rules

1. **Currency Support:** The default currency is Nigerian Naira (`NGN`), with ISO 4217 standard 3-character uppercase codes supported for international expansion (`USD`, `EUR`, `GBP`).
2. **Safe Monetary Validation:**
   - `regularPrice` must be strictly positive (`> 0.00`).
   - `salePrice` cannot be negative (`>= 0.00`).
   - `salePrice` must never exceed `regularPrice` (`salePrice <= regularPrice`).
   - If both `saleStartDate` and `saleEndDate` are provided, `saleEndDate` must be strictly after `saleStartDate`.
3. **Database & Application Dual-Layer Enforcement:**
   - Both Zod schema layer and Mongoose schema validators enforce price sanity.
   - Update queries (`findByIdAndUpdate`) run validators with safe update context parsing.

---

## 3. Product Variations Architecture

Variations enable products to represent distinct options (e.g. Size, Color, Capacity, Model) under a single parent catalog entity.

### Variation Sub-Document Structure

```ts
export interface IProductVariant {
  _id?: string;
  sku: string; // Unique variant SKU (e.g. SNK-RUN-001-BLU-42)
  name?: string; // Variant title (e.g. Blue / Size 42)
  price?: number; // Override price (if omitted, inherits parent regularPrice)
  salePrice?: number; // Override promotional price
  attributes: Record<string, unknown>; // e.g. { color: "Blue", size: "42" }
  images?: IProductImage[]; // Variant-specific image gallery
  stockQuantity?: number; // Prepared for Phase 8 inventory engine
  isAvailable?: boolean; // Availability toggle
}
```

### Validation & Downstream Phase Linkage Rules

- `hasVariants` flag must be set to `true` when variations exist.
- Variant SKUs must be unique within the product and cannot duplicate the parent product's primary SKU.
- Variant SKUs are validated globally against the entire catalog; two products cannot share a variant SKU.
- Variant prices must obey standard pricing rules (`price > 0`, `salePrice <= price`).
- Each variant has an auto-generated MongoDB `_id` rendered as both `id` and `variantId` in API responses, directly consumed by `Cart.items[].variantId`, `Order.items[].variantId`, and `InventoryMovement.variantId`.
- Each variant can define its own `imageUrl`, allowing storefront swatches to render color/model-specific imagery without duplicating entire products.

---

## 4. Attributes Map

For non-variant attributes (or single-variant products), the top-level `attributes` Map stores arbitrary specifications:

- `weightGrams` and `dimensions` (`length`, `width`, `height`, `unit`)
- Freeform specifications (e.g. `material: "Titanium"`, `bluetoothVersion: "5.3"`)
