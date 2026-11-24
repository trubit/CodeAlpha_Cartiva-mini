# Payment Integration Preparation & Phase 13 Boundary — Cartiva Mini (Phase 12)

## 1. Strict Phase Separation

In compliance with Cartiva Mini's architectural safety rules, **payment gateway integration belongs exclusively to Phase 13**.

Phase 12 establishes the complete checkout, validation, inventory reservation, and order creation pipeline without premature payment execution:

- **No Mock Payments:** Neither backend nor frontend claims that payment has been collected.
- **No Client Payment Claims:** The backend never accepts a payload stating `paymentStatus: "paid"`.
- **Order State Integrity:** All orders created in Phase 12 start in `OrderStatus.PENDING_PAYMENT` with `PaymentStatus.PENDING`.
- **Customer Transparency:** The checkout confirmation screen and order detail pages explicitly notify customers that payment settlement will occur in Phase 13.

---

## 2. Order Fields Prepared for Phase 13

Every order created in Phase 12 exposes the exact parameters needed by Paystack in Phase 13:

```typescript
{
  orderId: order._id.toString(),             // Internal DB ID
  orderNumber: order.orderNumber,           // Paystack transaction reference (ORD-YYYYMMDD-XXXXXX)
  email: customer.email,                    // Customer billing email
  amountMinor: order.totalAmountMinor,      // Amount in kobo (Paystack expects minor integer units)
  currency: order.currency,                 // 'NGN'
  reservationReference: order.reservationReference, // Phase 8 reservation reference
  metadata: {
    orderNumber: order.orderNumber,
    customerId: order.userId.toString(),
    cartItemCount: order.items.length,
  }
}
```

---

## 3. Phase 13 Payment Verification Contract

When Phase 13 activates the Paystack gateway, the order processing engine will integrate via the following lifecycle contract:

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Storefront as Cartiva Storefront
    participant Paystack as Paystack Gateway
    participant Backend as Cartiva Backend (Phase 13)
    participant Inventory as Inventory Service (Phase 8)
    participant OrderDB as Orders Database

    Storefront->>Backend: POST /api/v1/payments/initialize (orderNumber)
    Backend->>Paystack: Initialize Transaction (amountMinor, email, reference=orderNumber)
    Paystack-->>Backend: authorization_url
    Backend-->>Storefront: Redirect to authorization_url
    Customer->>Paystack: Completes 3DS Payment Authorization
    Paystack->>Backend: Server-to-Server Webhook (charge.success + HMAC-SHA512 signature)
    Backend->>Backend: Verify Paystack Signature (crypto.createHmac)
    alt Signature Valid & Amount Matches
        Backend->>Inventory: confirmReservation(orderId)
        Backend->>OrderDB: Update orderStatus = CONFIRMED, paymentStatus = PAID, paymentId
        Backend-->>Paystack: 200 OK
    else Signature Invalid or Fraudulent
        Backend->>Backend: Log Security Alert & Reject
        Backend-->>Paystack: 400 Bad Request
    end
```

### Safety Guarantees:

1. **Idempotency:** Repeated webhooks for the same order reference must not duplicate stock deductions or write redundant confirmations.
2. **Signature Verification:** All Paystack webhook events must verify the `x-paystack-signature` header against the environment `PAYSTACK_SECRET_KEY`.
3. **No Card Data Storage:** Cartiva Mini never captures, processes, or stores raw credit/debit card numbers or CVVs on its servers.
