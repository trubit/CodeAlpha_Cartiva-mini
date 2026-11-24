# Cartiva Mini — Checkout & Payment UI (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Checkout Journey & Workflow (`/checkout`)

The checkout interface (`frontend/src/pages/CheckoutPage.tsx`) unifies the backend functionality from Phase 11 (Shipping), Phase 12 (Checkout Sessions & Atomic Reservations), and Phase 13 (Paystack Payment Integration).

### Customer Flow Steps:
1. **Cart Review & Order Snapshot:**
   - Displays all items, chosen variations, quantities, and line item costs.
2. **Delivery Address Selection:**
   - Choose from saved customer addresses or add a new delivery destination inline.
3. **Available Shipping Method Selection:**
   - Live shipping rates fetched based on delivery state and parcel weight.
   - Transparent carrier name, delivery speed, and calculated shipping fees.
4. **Server-Authoritative Order Confirmation:**
   - Complete breakdown: Subtotal, Shipping Fee, Applied Coupon Discounts, and Final Authoritative Total (both in NGN and minor units/kobo).
   - Atomic inventory reservation locked for 30 minutes.
5. **Paystack Payment Initialization:**
   - Direct integration via Paystack Popup / Inline SDK.
   - Supports Card, Bank Transfer, USSD, and Mobile Money.
6. **Payment Result & Verification Handling:**
   - Post-payment verification query sent directly to backend `/api/v1/payments/verify/:reference`.
   - Clear loading and verification states. Payment is only confirmed when backend confirms `PaymentStatus.SUCCESSFUL`.
   - Never trusts client-side redirect query strings as proof of payment.
