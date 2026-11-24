# Cartiva Mini — Payment Status Lifecycle (Phase 13)

## 1. Supported Payment Statuses (`PaymentStatus` Enum)

| Status | Definition |
| :--- | :--- |
| `INITIALIZED` | Payment attempt registered; Paystack authorization URL generated |
| `PENDING` | Payment awaiting customer authorization or webhook verification |
| `PROCESSING` | Transaction submitted to banking network, awaiting clearing |
| `PAID` / `SUCCESSFUL` | Authoritatively verified by Paystack; Order confirmed and inventory deducted |
| `FAILED` | Declined by card issuer, insufficient funds, or gateway rejection |
| `ABANDONED` | Customer cancelled checkout or window expired without completion |
| `CANCELLED` | Manually cancelled prior to settlement |
| `REFUND_PENDING` | Refund requested and queued with Paystack |
| `PARTIALLY_REFUNDED` | Partial refund processed; portion of payment balance returned |
| `REFUNDED` | Entire transaction amount refunded |
| `REQUIRES_REVIEW` | Discrepancy detected (e.g., amount mismatch) requiring administrator audit |

---

## 2. Payment vs. Order Status Independence

| Payment Event | Payment Status | Order Status | Inventory Action |
| :--- | :--- | :--- | :--- |
| Initialization | `INITIALIZED` | `PENDING_PAYMENT` | Stock remains reserved (30-min TTL) |
| Customer Pays & Verified | `PAID` | `CONFIRMED` | Reservation confirmed into purchase deduction |
| Payment Fails | `FAILED` | `PENDING_PAYMENT` | Reservation remains active until TTL or cancellation |
| Customer Abandons | `ABANDONED` | `PENDING_PAYMENT` | Eligible for retry until reservation TTL expires |
| Administrative Refund | `REFUNDED` | Retains Order State | Separate return workflow; does not auto-cancel shipped orders |
| Financial Discrepancy | `REQUIRES_REVIEW` | `PENDING_PAYMENT` | Halted pending administrator investigation |
