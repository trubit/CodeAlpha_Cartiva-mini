# Cartiva Mini — Customer Delivery Address Management

## 1. Overview & Architectural Reuse

Phase 11 integrates customer delivery address management directly with shipping calculations and checkout preparation. In strict accordance with platform development rules, this phase reuses the production address functionality established in Phase 6 (`Address.model.ts` and `/api/v1/users/me/addresses`). No duplicate models or conflicting endpoints were created.

---

## 2. Customer Capabilities

Authenticated customers can manage their delivery addresses through the frontend modal interfaces (`AddressSelectorModal.tsx` and `AddressFormModal.tsx`):

1. **View Saved Addresses:** View all previously saved delivery destinations with clear default badges.
2. **Add New Address:** Save new delivery locations with international format compatibility.
3. **Edit Existing Address:** Update recipient name, phone number, street, apartment, city, state, postal code, or country.
4. **Delete Address:** Remove outdated delivery addresses with confirmation dialogs.
5. **Set Default Delivery Address:** Nominate a primary delivery address for one-click checkout and automatic quote calculation.
6. **Select for Quote / Checkout:** Pick any saved address to recalculate shipping charges in real time.

---

## 3. International Address Format Support

Cartiva Mini is designed for both domestic Nigerian operations and future international expansion. The schema and validation accommodate various global address formats:

```typescript
export interface AddressDto {
  _id: string;
  userId: string;
  recipientName: string; // Full name of person receiving delivery
  phone: string; // Contact phone number with international dial code support
  street: string; // Primary street address
  apartment?: string; // Suite, apartment, unit, floor, or building instructions
  city: string; // City, town, or locality
  state: string; // State, province, or region
  postalCode?: string; // ZIP or postal code (optional in Nigeria, required internationally)
  country: string; // Country name or ISO country code
  isDefault: boolean; // Single default flag per customer
  createdAt: string;
  updatedAt: string;
}
```

### Nigerian vs. International Compatibility

- **Nigeria:** `state` accepts any of the 36 states or FCT; `postalCode` is optional; `phone` supports formats like `+234 803 123 4567` or `08031234567`.
- **United Kingdom & Europe:** `postalCode` (e.g. `SW1A 2AA`) is captured cleanly; `state` accepts counties or administrative regions.
- **United States & Canada:** `state` accepts state codes or full names; `postalCode` accepts 5-digit or 9-digit ZIP codes.

---

## 4. Single-Default Invariant

To ensure consistent user experience:

- When a customer sets an address as default (`isDefault: true`), the backend automatically clears the default flag from all other addresses owned by that user in a unified database transaction or update cycle:
  ```typescript
  if (isDefault) {
    await Address.updateMany({ userId, _id: { $ne: addressId } }, { $set: { isDefault: false } });
  }
  ```
- If a customer deletes their default address, the platform safely reassigns or allows the customer to pick a new default on next entry.

---

## 5. Security & Insecure Direct Object Reference (IDOR) Protection

1. **Strict User Scoping:**
   - All customer address operations query MongoDB with compound filter: `{ _id: addressId, userId: req.user._id }`.
   - Customers cannot read, edit, or delete another customer's address under any circumstance.
2. **Shipping Quote IDOR Shield:**
   - In `POST /api/v1/shipping/quotes`, when an authenticated customer submits `{ addressId: "..." }`, the backend service verifies address ownership before executing the shipping calculation:
     ```typescript
     const address = await Address.findById(dto.addressId);
     if (!address) {
       throw AppError.notFound('Address not found', ErrorCode.ADDRESS_NOT_FOUND);
     }
     if (address.userId.toString() !== user.id) {
       throw AppError.forbidden(
         'You are not authorized to use this address for shipping calculation',
         ErrorCode.ADDRESS_ACCESS_DENIED
       );
     }
     ```
   - Attempting to pass another user's address ID returns `403 Forbidden` (`ADDRESS_ACCESS_DENIED`).
