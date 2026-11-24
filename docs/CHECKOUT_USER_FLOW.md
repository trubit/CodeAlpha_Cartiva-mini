# Customer Checkout User Flow — Cartiva Mini (Phase 12)

## 1. End-to-End User Journey

The Cartiva Mini checkout flow is organized into a linear, mobile-responsive 5-step experience designed for transparency, security, and low friction.

```
[ Cart Review ]
       ↓
[ Step 1: Destination Address ]
       ↓
[ Step 2: Shipping Method Selection ]
       ↓
[ Step 3: Authoritative Items & Totals Summary ]
       ↓
[ Step 4: Terms Acceptance & Order Confirmation ]
       ↓
[ Order Confirmation Screen (Pending Payment Notice) ]
```

---

## 2. Detailed Step-by-Step Breakdown

### Step 1: Order Review & Session Initialization

- **Action:** Customer navigates to `/checkout` from the shopping cart.
- **Backend Behavior:**
  - Invokes `POST /api/v1/checkout/session`.
  - Verifies authentication. If unauthenticated, the application redirects the customer to `/login` with a return URL.
  - Verifies cart contains at least 1 item.
  - Re-evaluates authoritative prices and stock for all cart items.
  - Returns current items snapshot, minor unit totals, and initial session step (`REVIEW`).

### Step 2: Delivery Destination Address

- **Action:** Customer selects a saved address or adds a new address using the built-in modal.
- **Backend Behavior:**
  - Invokes `PATCH /api/v1/checkout/session/address` with `{ addressId }`.
  - Verifies address ownership against the authenticated customer's ID.
  - Saves an immutable snapshot of the address into `session.shippingAddressSnapshot`.
  - Sets session step to `SHIPPING`.
  - Resets any previously selected shipping method if the destination state or country changed.

### Step 3: Shipping Method Selection

- **Action:** Customer views available shipping carriers and methods configured for their delivery state/country.
- **Backend Behavior:**
  - Queries `GET /api/v1/shipping/methods?country=...&state=...`.
  - Displays real-time estimated transit times (e.g., "1–3 business days") and carrier names.
  - On method selection, client invokes `PATCH /api/v1/checkout/session/shipping` with `{ shippingMethodId }`.
  - Backend verifies the method is active and valid for the destination.
  - Calculates shipping fee using authoritative weight and free shipping threshold rules.
  - Computes `session.shippingFeeMinor` and updates `session.totalAmountMinor`.
  - Advances step to `PAYMENT`.

### Step 4: Authoritative Order Review & Confirmation

- **Action:** Customer inspects the order summary sidebar, enters optional delivery instructions, checks the required Terms of Sale checkbox, and clicks **"Place Order & Proceed to Payment"**.
- **Backend Behavior:**
  - Invokes `POST /api/v1/checkout/confirm` with `{ acceptTerms: true, customerNotes: "..." }`.
  - Re-validates that destination address and shipping method are bound.
  - Executes atomic inventory reservation for all order items via Phase 8 `inventoryService.createReservation`.
  - Creates the immutable order record in `OrderStatus.PENDING_PAYMENT` with `PaymentStatus.PENDING`.
  - Binds the unique `reservationReference` to the order.
  - Clears the customer's shopping cart (`Cart.items = []`).
  - Records an audit log entry for order placement.
  - Returns `orderNumber` (`ORD-YYYYMMDD-XXXXXX`), total amount, and reservation reference.

### Step 5: Order Confirmation Page

- **Action:** Frontend navigates to `/checkout/confirmation/:orderNumber`.
- **Display Details:**
  - Clear success checkmark badge and human-readable order reference.
  - Transparent notification explaining that inventory has been atomically reserved for 30 minutes.
  - Clear disclosure that payment settlement via Paystack will occur in Phase 13.
  - Full snapshot breakdown of items, delivery address, carrier, and final total.
  - Navigation options to "View My Orders" (`/orders`) or "Continue Shopping" (`/`).

---

## 3. Graceful Error Handling & Recovery

| Scenario                                            | System Response                                                             | User Experience                                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Cart becomes empty before checkout                  | Backend returns `CHECKOUT_EMPTY_CART` (400)                                 | User is shown an alert with a "Continue Shopping" button.                                                 |
| Customer tries to access another customer's address | Backend rejects with 403 Forbidden                                          | Error banner displayed; customer must choose their own address.                                           |
| Destination has no available shipping methods       | Shipping methods query returns empty list                                   | Warning alert: "Delivery is currently not available to [State]. Please select a different address."       |
| Item price updated in catalog while in cart         | Backend re-calculates subtotal authoritatively                              | New price is reflected in summary before order confirmation; customer is never charged unexpected totals. |
| Insufficient stock during atomic reservation        | Reservation fails atomically, rolls back partial locks                      | Error returned: "Insufficient stock for [Product] ([X] available, [Y] requested)." Order is not created.  |
| Duplicate order button click                        | Frontend disables button during mutation; backend checks session completion | Second request rejected; only one order created.                                                          |
