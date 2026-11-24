# Cartiva Mini — Financial Reconciliation (Phase 13)

## 1. Purpose & Capabilities

Financial reconciliation provides administrators with an automated mechanism to compare internal transaction records against Paystack's authoritative API data.

### Reconciliation Verifies:
1. **Amount Alignment**: Compares `payment.amountMinor` against `provider.amountMinor`.
2. **Currency Alignment**: Compares internal currency against provider settlement currency.
3. **Status Alignment**:
   - `PaymentStatus.PAID` must correspond to Paystack `status === 'success'`.
   - `PaymentStatus.FAILED` must correspond to Paystack `status === 'failed'`.
   - `PaymentStatus.ABANDONED` must correspond to Paystack `status === 'abandoned'`.
4. **Discrepancy Reporting**: Surfaces unmatched amounts, currency mismatches, or status desyncs.

---

## 2. Distinction Between Payment Success and Bank Settlement

> [!NOTE]
> - **Payment Success**: The customer's card/account was debited, and Paystack has confirmed the transaction.
> - **Merchant Settlement**: The payout from Paystack into Cartiva Mini's commercial bank account (typically Next Day `T+1` for local Nigerian cards or `T+5` for international cards).
> - Cartiva Mini records transaction success upon verified charge and records reconciliation without falsely claiming settlement before payout receipts.

---

## 3. Reconciliation Endpoint

- **Endpoint**: `GET /api/v1/admin/payments/reconciliation`
- **Security**: Bearer JWT with `UserRole.ADMIN`.
- **Query Parameter**: Optional `reference` to reconcile a specific transaction.
- **Output**: Array of `ReconciliationResultDto` detailing matched status and discrepancy notes.
