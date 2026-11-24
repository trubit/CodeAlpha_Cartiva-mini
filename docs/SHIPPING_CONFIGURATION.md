# Cartiva Mini — Shipping Configuration Management

## 1. Overview

Cartiva Mini enables platform administrators to configure shipping methods, define geographic delivery zones, establish multi-tiered pricing rules, and manage delivery transit times without code deployments.

---

## 2. Administrative Capabilities

Authorized administrators (`UserRole.ADMIN`) have complete control over shipping configurations via the backend REST API (`/api/v1/admin/shipping/configurations`) and the frontend administrative interface (`ShippingConfigManagerModal.tsx`):

1. **Create Shipping Methods:** Define new delivery methods for specific regions or countries.
2. **Edit Existing Configurations:** Update zone names, method names, pricing tiers, transit days, and service areas.
3. **Activate / Deactivate:** Instantly pause or resume shipping options without deleting history.
4. **Configure Geographic Service Areas:** Define covered countries (e.g. `['Nigeria', 'Ghana', 'United Kingdom']`) and covered states/regions (e.g. `['Lagos', 'Ogun']` or `['*']` for nationwide).
5. **Configure Calculation Models:** Choose between Flat Rate, Weight-Tiered Rate, and Free-Above-Threshold.
6. **Configure Transit Day Estimates:** Set minimum and maximum estimated business days (e.g. 1 to 2 business days).
7. **Safe Archival / Deletion:** Permanently remove deprecated configurations.
8. **Audit Trail Review:** All actions are automatically tracked in the system audit log.

---

## 3. Configuration Schema & Fields

| Field Name                   | Type                | Description                                                                  | Example                                               |
| :--------------------------- | :------------------ | :--------------------------------------------------------------------------- | :---------------------------------------------------- |
| `zoneName`                   | `String`            | Human-readable name of the delivery zone                                     | `Lagos Metropolitan Zone`                             |
| `methodName`                 | `String`            | Customer-facing name of the shipping method                                  | `Standard Doorstep Delivery`                          |
| `description`                | `String` (Optional) | Detailed explanation or carrier notes                                        | `Delivered within 24-48 hours via dispatched courier` |
| `countriesCovered`           | `String[]`          | List of countries where this method applies (`['*']` for global)             | `['Nigeria']`                                         |
| `statesCovered`              | `String[]`          | List of states or regions where this method applies (`['*']` for nationwide) | `['Lagos']`                                           |
| `calculationType`            | `Enum`              | Pricing model: `flat`, `weight_tiered`, or `free_above_threshold`            | `flat`                                                |
| `baseRateMinor`              | `Number`            | Fixed base fee in minor units (integer kobo/cents)                           | `250000` (₦2,500.00)                                  |
| `baseWeightKg`               | `Number`            | Baseline weight covered by `baseRateMinor`                                   | `1.0` (1 kg)                                          |
| `ratePerKgMinor`             | `Number`            | Additional fee per kg for weight beyond `baseWeightKg`                       | `50000` (₦500.00 / kg)                                |
| `freeShippingThresholdMinor` | `Number`            | Minimum order subtotal qualifying for free delivery                          | `5000000` (₦50,000.00)                                |
| `currency`                   | `String`            | ISO 4217 currency code                                                       | `NGN`                                                 |
| `estimatedMinDays`           | `Number`            | Minimum estimated transit days                                               | `1`                                                   |
| `estimatedMaxDays`           | `Number`            | Maximum estimated transit days                                               | `2`                                                   |
| `isActive`                   | `Boolean`           | Operational toggle (true = active, false = disabled)                         | `true`                                                |

---

## 4. Calculation Models Explained

### Model A: Flat Rate (`calculationType: 'flat'`)

- Charge is fixed regardless of order weight or subtotal.
- Fee calculation formula:
  $$\text{FeeMinor} = \text{baseRateMinor}$$
- Example: Standard Lagos delivery costs a flat ₦2,500 (`250000` minor units).

### Model B: Weight-Tiered Rate (`calculationType: 'weight_tiered'`)

- Charge includes a base rate up to `baseWeightKg`. Weight exceeding `baseWeightKg` incurs incremental charges per kilogram (rounded up to nearest whole kg).
- Fee calculation formula:
  $$\text{ExcessKg} = \max(0, \lceil \text{TotalWeightKg} - \text{BaseWeightKg} \rceil)$$
  $$\text{FeeMinor} = \text{baseRateMinor} + (\text{ExcessKg} \times \text{ratePerKgMinor})$$
- Example: Regional delivery has `baseRateMinor: 350000` (₦3,500) for first 1 kg, and `ratePerKgMinor: 50000` (₦500) per extra kg. A 3.5 kg package has 3 excess kg, resulting in:
  $$350000 + (3 \times 50000) = 500000 \text{ minor units (₦5,000.00)}$$

### Model C: Free Above Threshold (`calculationType: 'free_above_threshold'`)

- If the cart subtotal equals or exceeds `freeShippingThresholdMinor`, the shipping fee is waived (`0`).
- If subtotal is below the threshold, `baseRateMinor` applies.
- Fee calculation formula:
  $$\text{FeeMinor} = \begin{cases} 0 & \text{if SubtotalMinor} \ge \text{freeShippingThresholdMinor} \\ \text{baseRateMinor} & \text{otherwise} \end{cases}$$
- Example: Standard shipping is ₦2,500, but free for orders over ₦50,000.

---

## 5. Administrative Interface Workflow

The `ShippingConfigManagerModal` provides administrators with an intuitive tabbed interface:

1. **Configurations List View:**
   - Displays all active and inactive configurations in a searchable table.
   - Shows Zone Name, Method Name, Calculation Type badge, Base Rate, Transit Days, and Active toggle.
   - One-click status switch triggers an immediate optimistic update and backend audit log entry.
2. **Configuration Form View:**
   - Pre-populated form for editing existing methods or blank form for creating new ones.
   - Select calculation type dynamically displays relevant inputs (e.g. rate per kg or free shipping threshold).
   - Form validates client-side with Zod before sending payload to `POST /api/v1/admin/shipping/configurations` or `PATCH /api/v1/admin/shipping/configurations/:id`.
