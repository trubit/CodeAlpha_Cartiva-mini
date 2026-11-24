# Cartiva Mini — Address Management Architecture & Rules

## 1. Overview

The Address Management subsystem provides customers with a reliable, structured, and resilient address book for e-commerce checkouts, shipping calculation, and physical deliveries.

In e-commerce architectures, address management has direct legal, logistical, and financial consequences. This document details the integrity invariants, authorization guards, self-healing mechanisms, and immutability patterns implemented in Cartiva Mini.

---

## 2. Integrity Invariants

### 2.1 Enforced Address Limit (Max 10 per Customer)

Customers may maintain a maximum of 10 saved delivery addresses (`MAX_USER_ADDRESSES = 10` in `user.constants.ts`).

- **Rationale**: Mitigates resource exhaustion attacks, prevents runaway index sizes, and encourages clean customer address management.
- **Enforcement**: Prior to inserting an address, `Address.countDocuments({ userId })` is evaluated. If the count equals or exceeds 10, the API returns `400 Bad Request` with code `MAX_ADDRESSES_REACHED`.

---

### 2.2 Single Default Address Invariant

A customer must have **at most one** default delivery address at any given moment.

- **Atomic Two-Phase Update**:
  When an address is created or updated with `isDefaultShipping: true`, or promoted via `PATCH /users/me/addresses/:addressId/default`:
  ```typescript
  // Phase 1: Clear all other default flags for this customer atomically
  await Address.updateMany({ userId: customerId }, { isDefaultShipping: false });

  // Phase 2: Set the target address as default
  await Address.updateOne(
    { _id: targetAddressId, userId: customerId },
    { isDefaultShipping: true }
  );
  ```
- **Automatic First-Address Promotion**:
  When a customer adds their first address (`addressCount === 0`), the system automatically sets `isDefaultShipping = true`, ensuring subsequent checkout flows have a pre-selected delivery destination.

---

### 2.3 Default Address Deletion Self-Healing

If a customer deletes their active default address, deleting it without reassignment would leave the customer with multiple non-default addresses and no primary shipping choice.

To prevent checkout friction and orphaned states:

1. When deleting an address (`DELETE /users/me/addresses/:id`), the system inspects whether the target address had `isDefaultShipping: true`.
2. If it was the default, the service queries the database for the newest remaining address belonging to the user (`findFirstAddressByUserId`).
3. If an address remains, it is automatically promoted to `isDefaultShipping: true`.
4. If no addresses remain, the user cleanly transitions to an empty address state.

---

## 3. Order Address Snapshotting & Immutability

> [!IMPORTANT]
> **Core E-Commerce Principle**: Modifying or deleting a customer's saved address in their address book must **NEVER** alter past orders, pending deliveries, or historical tax invoices.

When an order is placed (Phase 10: Checkout & Order Engine):

1. The delivery address is deep-copied (snapshotted) directly into the `Order.shippingAddress` subdocument.
2. The order stores the recipient name, phone, street, apartment, landmark instructions, city, state, country, and postal code at the exact moment of order placement.
3. Subsequent customer operations on `/api/v1/users/me/addresses` (updates or deletions) only affect future checkout sessions; historical order documents remain immutable.

---

## 4. Security & Insecure Direct Object Reference (IDOR) Mitigation

Address book endpoints represent a frequent target for IDOR vulnerabilities in web applications.

### 4.1 Strict Multi-Tenant Isolation

All queries in `user.repository.ts` combine the address `_id` with the authenticated `userId`:

```typescript
async findAddressByIdAndUser(addressId: string, userId: string): Promise<AddressDocument | null> {
  return Address.findOne({ _id: addressId, userId });
}

async deleteAddress(addressId: string, userId: string): Promise<AddressDocument | null> {
  return Address.findOneAndDelete({ _id: addressId, userId });
}
```

### 4.2 Safe Error Handling

If an authenticated user attempts to read, update, or delete an address ID belonging to another user, the API responds with:

- HTTP `404 Not Found` (`ADDRESS_NOT_FOUND`)
- The API intentionally avoids returning `403 Forbidden` for IDOR attempts to prevent attackers from enumerating valid address ObjectIds across the platform.

---

## 5. Nigerian & Regional Delivery Specifics

Cartiva Mini is designed for high fulfillment accuracy in Nigerian and West African logistics:

- **Delivery Instructions / Landmarks**: In many metropolitan areas (e.g. Lagos, Abuja, Port Harcourt), street numbering can be irregular. Cartiva Mini provides a dedicated `deliveryInstructions` field (up to 500 characters) for gate codes, estate security protocols, and nearby landmarks.
- **Phone Number Validation**: Strict E.164 phone validation ensures couriers can reliably contact recipients via call or SMS upon delivery.
- **Default Country**: Default country is set to `Nigeria`, while remaining fully adaptable for cross-border regional expansion.
