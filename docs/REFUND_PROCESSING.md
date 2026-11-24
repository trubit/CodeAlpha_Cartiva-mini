# Cartiva Mini — Refund Processing & Management (Phase 13)

## 1. Refund Architectural Foundation

Refunds are restricted to authorized administrators (`UserRole.ADMIN`) and managed via `backend/src/modules/payment/payment.service.ts` (`processRefund`).

### Rules & Financial Constraints:
1. **Existing Successful Payment Required**:
   - Only payments in `PaymentStatus.PAID` or `PARTIALLY_REFUNDED` are eligible for refund.
2. **Refundable Balance Protection**:
   - `availableToRefundMinor = payment.amountMinor - (payment.refundedAmountMinor || 0)`.
   - The requested refund amount cannot exceed `availableToRefundMinor`.
   - If `availableToRefundMinor <= 0`, requests are rejected with `REFUND_EXCEEDS_BALANCE`.
3. **Gateway Communication**:
   - Calls Paystack API: `POST /refund` with transaction reference, minor unit amount, currency, and notes.
4. **Immutable Ledger Entry**:
   - Records an entry in the `Refund` collection.
   - Records an immutable `Transaction` ledger entry with `TransactionType.REFUND`.
   - Records administrative audit entry in `AuditLog`.
5. **Partial vs Full Refund Status**:
   - If cumulative refunded amount reaches total transaction amount, `Payment.status` transitions to `REFUNDED`.
   - Otherwise, `Payment.status` transitions to `PARTIALLY_REFUNDED`.

---

## 2. Administrator Refund API

- **Endpoint**: `POST /api/v1/admin/payments/:paymentId/refunds`
- **Request Body**:
  ```json
  {
    "amount": 100.50,
    "reason": "Customer cancelled before shipment",
    "customerNote": "Refund issued to your card within 3-5 business days"
  }
  ```
  *(Leaving `amount` omitted triggers a full refund for the remaining refundable balance).*
- **Response**: `ApiResponse<RefundDto>`
