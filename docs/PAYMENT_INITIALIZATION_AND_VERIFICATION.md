# Cartiva Mini — Payment Initialization & Server-Side Verification (Phase 13)

## 1. Payment Initialization (`POST /api/v1/payments/initialize`)

Payment initiation converts an order in `PENDING_PAYMENT` state into an authorized Paystack gateway transaction session.

### Execution Pipeline:
1. **Authentication & Ownership**:
   - The user must be authenticated with a valid Bearer JWT.
   - The order's `userId` must match `req.user.id`.
2. **Order Eligibility**:
   - Status must be `OrderStatus.PENDING_PAYMENT` or allow payment retry.
   - If `order.paymentStatus === 'paid'`, initiation is rejected immediately.
   - If order is `CANCELLED`, initiation is rejected.
3. **Authoritative Amount & Currency**:
   - Read directly from `order.totalAmountMinor` and `order.currency`.
   - Never accept financial amounts from the client payload.
   - Check against supported currency catalog (`['NGN', 'USD', 'GHS', 'ZAR', 'KES']`).
4. **Idempotency & Active Attempt Check**:
   - If an active `Payment` record exists in `INITIALIZED` status with a valid `authorizationUrl`, the existing reference is returned, preventing multiple dangling payable transactions.
5. **Gateway Provider Call**:
   - Calls Paystack `POST /transaction/initialize`.
   - Stores `paymentReference`, `authorizationUrl`, `accessCode`, and `amountMinor`.
   - Returns client authorization payload.

---

## 2. Server-Side Payment Verification (`GET /api/v1/payments/:reference/verify`)

> [!CRITICAL]
> **Zero Frontend Trust**:
> A browser redirect or query parameter saying `trxref=...` is **never** accepted as proof of payment. Cartiva Mini contacts Paystack directly from the backend server before confirming orders.

### Server Verification Pipeline:
1. **Reference Lookup**:
   - Resolves `Payment` by unique reference string.
   - Resolves associated `Order`.
2. **Idempotency Check**:
   - If `payment.status === 'paid'`, returns the existing confirmed result immediately, preventing duplicate inventory deductions or double confirmations.
3. **Direct Gateway Verification**:
   - Calls Paystack API: `GET /transaction/verify/:reference`.
4. **Cryptographic & Financial Integrity Validation**:
   - Status MUST be `'success'`.
   - Amount MUST match internal `payment.amountMinor` exactly. Any discrepancy flags the transaction as `REQUIRES_REVIEW` and halts confirmation.
   - Currency MUST match internal `payment.currency`.
5. **Atomic State Transitions**:
   - `Payment.status` -> `PaymentStatus.PAID`.
   - `Order.orderStatus` -> `OrderStatus.CONFIRMED`.
   - `Order.paymentStatus` -> `PaymentStatus.PAID`.
   - `inventoryService.confirmReservation(order.reservationReference, order.orderNumber)` -> converts hold to permanent deduction.
   - Records immutable `Transaction` ledger entry (`TransactionType.CHARGE`).
   - Writes an entry to `AuditLog`.
