# Checkout Architecture — Cartiva Mini (Phase 12)

## 1. Architectural Overview

Cartiva Mini implements a secure, authoritative, server-orchestrated checkout pipeline. The checkout system connects multiple foundational subsystems developed in earlier phases:

- **Customer Authentication & Profiles (Phases 5 & 6):** Secure session identity and user ownership enforcement.
- **Address Management (Phases 6 & 11):** Delivery destination address validation and snapshot persistence.
- **Product Catalog & Pricing Rules (Phases 7 & 9):** Authoritative price retrieval from published product models, preventing client price tampering.
- **Inventory & Reservations (Phase 8):** Real-time stock verification, concurrency handling, and atomic reservations.
- **Shopping Cart (Phase 10):** Current item selection, variation mappings, and line quantities.
- **Shipping Configuration & Calculation (Phase 11):** Destination-based carrier and rate calculation using minor units.
- **Order Model & Processing (Phase 12):** Immutable historical order creation, audit tracking, and lifecycle management.
- **Payment Preparation (Phase 12 Boundary for Phase 13):** Strict financial separation where orders start in `PENDING_PAYMENT` with `PaymentStatus.PENDING`.

```mermaid
graph TD
    A[Customer Cart] -->|POST /checkout/session| B[Authoritative CheckoutSession]
    B -->|PATCH /checkout/session/address| C[Address Validation & Snapshot]
    C -->|PATCH /checkout/session/shipping| D[Shipping Method & Fee Calculation]
    D -->|POST /checkout/validate| E[Pre-flight Integrity & Stock Verification]
    E -->|POST /checkout/confirm| F[Atomic Inventory Reservation]
    F -->|On Reservation Success| G[Create Immutable Order (PENDING_PAYMENT)]
    G --> H[Empty Customer Cart]
    G --> I[Write Audit Log]
    G --> J[Return Order Reference (Phase 13 Payment Hand-off)]
    F -->|On Reservation Failure| K[Rollback & Return Actionable Error]
```

---

## 2. Server-Side Checkout Context (`CheckoutSession`)

To maintain complete control and prevent client-side manipulation, Cartiva Mini maintains a persistent, server-side checkout context represented by the `CheckoutSession` model.

### Key Schema Elements:

- **`sessionId` (UUIDv4):** Unique internal session identifier.
- **`userId` (ObjectId):** Authenticated customer reference with strict ownership validation on every endpoint.
- **`cartId` (ObjectId):** Associated customer shopping cart reference.
- **`shippingAddressId` & `shippingAddressSnapshot`:** Selected destination address snapshot containing `recipientName`, `phone`, `streetAddress`, `apartmentSuite`, `city`, `state`, and `country`.
- **`shippingMethodId` & `shippingMethodSnapshot`:** Authoritative carrier and method details, calculated rate, transit estimates, and free shipping flags.
- **`step` (Enum):** Linear progression tracker (`REVIEW` -> `ADDRESS` -> `SHIPPING` -> `PAYMENT` -> `CONFIRMATION`).
- **Financial Calculations (Minor Units):**
  - `subtotalMinor`: Authoritative sum of items from current database prices.
  - `shippingFeeMinor`: Server-computed shipping fee for the selected method and cart weight.
  - `discountAmountMinor`: Validated discount deduction.
  - `taxAmountMinor`: Applicable tax minor units.
  - `totalAmountMinor`: Final exact amount payable (`subtotal + shippingFee - discount + tax`).
  - `currency`: Default `NGN`.
- **`expiresAt` (Date):** TTL index configured at 3600 seconds (1 hour) for automatic database cleanup of abandoned checkout sessions.

---

## 3. Strict Zero-Trust Security Model

Cartiva Mini never trusts values submitted by frontend clients:

1. **Client Price Submission Rejection:** Prices submitted in payload bodies are discarded. The server retrieves the latest authoritative pricing directly from `Product` and variation records using `cartService.determineAuthoritativePrice`.
2. **Stock Verification:** At both session review and confirmation stages, available inventory is re-checked through `inventoryRepository.resolveTarget`.
3. **Address Ownership:** Before binding an address to the checkout session, the backend verifies that `address.userId.toString() === customer.id` (preventing IDOR attacks).
4. **Shipping Fee Calculation:** Shipping fees are computed strictly server-side using the `ShippingConfiguration` repository, evaluating destination zone, tiered weights, and free shipping thresholds.
5. **State Progression Enforcement:** An order cannot be confirmed unless both a verified destination address and an active shipping method have been bound to the session.

---

## 4. Payment Boundary (Phase 13 Preparation)

In strict compliance with Cartiva Mini's financial safety specifications:

- **No False Payment Claims:** Orders created during Phase 12 are marked `OrderStatus.PENDING_PAYMENT` with `PaymentStatus.PENDING`.
- **No Mock Payments:** Neither frontend nor backend marks orders as paid without verified payment gateway callbacks.
- **Hand-off Point:** The order returns a unique reference (`ORD-YYYYMMDD-XXXXXX`), reservation reference, and exact minor unit amounts, ready for Paystack integration in Phase 13.
