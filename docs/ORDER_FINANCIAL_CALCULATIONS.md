# Financial Calculations & Minor Unit Precision — Cartiva Mini (Phase 12)

## 1. Principles of Financial Calculation

To safeguard financial integrity and comply with accounting audit requirements, Cartiva Mini follows strict calculation rules:

1. **Integer Minor Units:** All financial variables are persisted, computed, and compared exclusively as integers representing minor currency units (e.g. 1 Naira = 100 kobo).
2. **Elimination of IEEE 754 Floating-Point Inaccuracies:** In JavaScript, operations like `0.1 + 0.2 === 0.30000000000000004` introduce cumulative fractional pennies that corrupt grand totals. Using integer minor units prevents fractional inaccuracies.
3. **Server-Side Authoritative Totals:** Grand totals and line items are never accepted from client payloads. Totals are derived from database records and backend configuration.
4. **Transparent Formatting:** Major currency representations are formatted strictly for display using standard `Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' })`.

---

## 2. Calculation Formulae

```
┌────────────────────────────────────────────────────────────────────────┐
│ Line Item Total Minor = Unit Price Minor × Quantity                    │
│                                                                        │
│ Subtotal Minor = ∑ (Line Item Total Minor)                             │
│                                                                        │
│ Total Amount Minor = Subtotal Minor                                    │
│                    + Shipping Fee Minor                                │
│                    - Discount Amount Minor                             │
│                    + Tax Amount Minor                                  │
│                                                                        │
│ Display Major Unit = Total Amount Minor / 100                          │
└────────────────────────────────────────────────────────────────────────┘
```

### Detailed Component Rules:

#### 1. Unit Price Resolution (`unitPriceMinor`)

- Extracted from `product.salePrice` (if actively on sale) or `product.regularPrice`.
- Converted to minor units: `Math.round(unitPrice * 100)`.
- If a variation is selected, the variation's specific price override is evaluated.

#### 2. Line Subtotal (`lineTotalMinor`)

- Calculated as: `item.unitPriceMinor * item.quantity`.
- Validated to ensure `item.quantity >= 1` and does not exceed maximum stock limits.

#### 3. Shipping Fee (`shippingFeeMinor`)

- Evaluated using Phase 11 `ShippingConfiguration` repository based on destination country and state.
- **Flat Rate Calculation:** Fixed base rate converted to minor units (`Math.round(config.baseRate * 100)`).
- **Weight-Based Calculation:**
  ```
  Base Weight Threshold = 1.0 kg
  Additional Weight = Math.max(0, totalWeightKg - 1.0)
  Additional Fee Minor = Math.ceil(Additional Weight) × Math.round(config.ratePerAdditionalKg * 100)
  Shipping Fee Minor = Base Rate Minor + Additional Fee Minor
  ```
- **Free Shipping Threshold:** If `config.freeShippingThreshold` is configured and `subtotalMinor >= config.freeShippingThreshold * 100`, `shippingFeeMinor = 0`.

#### 4. Discounts & Promotions (`discountAmountMinor`)

- Real, approved discount codes from Phase 10 cart are verified.
- Disallowed from exceeding `subtotalMinor` (cannot result in negative totals).

#### 5. Taxes (`taxAmountMinor`)

- Applied only if an authoritative tax configuration exists. Cartiva Mini prices default to inclusive VAT, with `taxAmountMinor = 0` added on top unless explicit B2B invoicing rules apply.

---

## 3. Worked Verification Example

Consider an order containing:

- 2 × Noise Cancelling Headphones @ ₦45,000.00 each
- Delivery to Lekki, Lagos via Standard Express Delivery (Base rate ₦2,500.00, weight 0.8 kg)

```
1. Unit Price Minor:
   45,000 × 100 = 4,500,000 kobo

2. Line Total Minor:
   4,500,000 × 2 = 9,000,000 kobo (₦90,000.00)

3. Subtotal Minor:
   9,000,000 kobo

4. Shipping Fee Minor:
   2,500 × 100 = 250,000 kobo (₦2,500.00)
   (Cart weight 0.8kg < 1.0kg base weight threshold)

5. Discount Minor:
   0 kobo

6. Grand Total Minor:
   9,000,000 + 250,000 = 9,250,000 kobo (₦92,500.00)
```

The server records both minor and major units:

- `subtotalMinor: 9000000`, `subtotal: 90000`
- `shippingFeeMinor: 250000`, `shippingFee: 2500`
- `totalAmountMinor: 9250000`, `totalAmount: 92500`
