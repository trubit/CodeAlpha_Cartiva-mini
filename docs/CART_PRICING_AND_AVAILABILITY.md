# Cart Pricing and Availability Architecture

## 1. Overview

E-commerce carts must prevent two major financial and operational vulnerabilities:

1. **Price Tampering:** Clients spoofing product prices or discounts in HTTP payloads.
2. **Overselling / Stock Outages:** Customers checking out items that are out of stock.

Cartiva Mini implements strict server-side price validation, minor-unit financial arithmetic, dynamic price-change notifications, and atomic inventory stock verification.

---

## 2. Server-Side Price Retrieval

Prices submitted by the frontend are strictly ignored. When an item is added or a cart is retrieved:

1. The backend queries `Product` and `variants` directly from MongoDB.
2. If a `variantId` is specified, `variant.price` is selected.
3. If no variant is specified, the system checks whether a promotional sale is currently active:
   $$\text{now} \ge \text{saleStartDate} \quad \text{and} \quad \text{now} \le \text{saleEndDate}$$
   If active and `salePrice > 0`, `salePrice` is selected; otherwise, `regularPrice` is selected.
4. Currency consistency is verified: all items in a cart must share the same currency.

---

## 3. Integer Minor Unit Calculations

To eliminate IEEE 754 floating-point inaccuracies (e.g. $0.1 + 0.2 = 0.30000000000000004$), all cart calculations are conducted in integer minor units (kobo / cents):

$$\text{unitPriceMinor} = \text{Math.round}(\text{unitPrice} \times 100)$$
$$\text{lineTotalMinor} = \text{unitPriceMinor} \times \text{quantity}$$
$$\text{subtotalMinor} = \sum \text{lineTotalMinor}$$
$$\text{totalMinor} = \max(0, \text{subtotalMinor} - \text{discountAmountMinor})$$

Both decimal values (`unitPrice`, `lineTotal`, `subtotal`, `total`) and integer minor units (`unitPriceMinor`, `lineTotalMinor`, `subtotalMinor`, `totalMinor`) are returned in DTOs.

---

## 4. Price Change Detection & Notification

If a product's price in the database is modified while it is sitting in a customer's cart:

1. On the next cart retrieval (`GET /api/v1/cart`), the service detects:
   $$\text{item.unitPrice} \ne \text{authoritativePrice}$$
2. The item is automatically updated to the authoritative price.
3. The cart is flagged with `hasPriceChanges: true`.
4. A structured `priceChanges` entry is generated:
   ```json
   {
     "itemId": "672412e...",
     "productId": "672401f...",
     "title": "Ergonomic Mechanical Keyboard",
     "oldPrice": 39000,
     "newPrice": 48000,
     "difference": 9000
   }
   ```
5. The frontend displays a notification explaining the updated total.

---

## 5. Inventory Availability Integration

### Phase 8 Atomic Formula

$$\text{Available Stock} = \text{stockQuantity} - \text{reservedQuantity}$$

### Policy: No Premature Reservation

- Adding an item to the cart does **not** reserve stock. Stock reservation occurs only during checkout (Phase 12).
- When retrieving the cart, if stock has depleted below the cart quantity, the item is flagged with `isAvailable: false`, `availableStock: N`, and `availabilityMessage: 'Only N items available in stock.'`.
