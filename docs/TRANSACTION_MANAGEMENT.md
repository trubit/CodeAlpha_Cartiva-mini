# Cartiva Mini — Transaction Management & Immutable Ledger (Phase 13)

## 1. Transaction Ledger Overview

Financial transactions in Cartiva Mini are stored in the `Transaction` collection as an **immutable double-entry ledger**. Historical transaction records cannot be updated or deleted by any user or administrator.

---

## 2. Document Schema (`ITransaction`)

| Field | Type | Description |
| :--- | :--- | :--- |
| `transactionReference` | `String` (Unique) | Unique reference identifier (e.g., `TXN-YYYYMMDD-XXXXXX`) |
| `paymentId` | `ObjectId` (Ref: Payment) | Link to originating payment document |
| `orderId` | `ObjectId` (Ref: Order) | Associated customer order |
| `userId` | `ObjectId` (Ref: User) | Associated customer account |
| `type` | `TransactionType` | `CHARGE`, `REFUND`, `PAYOUT`, `ADJUSTMENT` |
| `amount` | `Number` | Transaction amount in major units |
| `amountMinor` | `Number` | Exact integer minor units (kobo/cents) |
| `currency` | `String` | 3-letter ISO code (`NGN`, `USD`, etc.) |
| `gatewayFeeMinor` | `Number` | Processing fee charged by Paystack |
| `netAmountMinor` | `Number` | Net revenue credited to merchant account (`amountMinor - gatewayFeeMinor`) |
| `status` | `String` | `'successful'`, `'pending'`, `'failed'` |
| `description` | `String` | Descriptive narrative of the ledger event |
| `timestamp` | `Date` | Timestamp of creation (immutable) |

---

## 3. Strict Non-Storage of Sensitive Payment Data

Cartiva Mini enforces strict PCI-DSS compliance:
- **Never Stored**: Raw Primary Account Numbers (PANs), CVV/CVC codes, PINs, card expiration dates, or 3D Secure passwords.
- **Allowed Safe Metadata**: Last 4 digits of card (e.g. `4081`), card type (`visa`/`mastercard`), bank name, and Paystack channel name.
