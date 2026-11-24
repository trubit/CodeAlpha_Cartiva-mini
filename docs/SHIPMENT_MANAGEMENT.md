# Cartiva Mini — Shipment Management
**Phase 14: Order Fulfilment & Tracking**

---

## 1. Shipment Model & Record Structure

Shipment records are managed through the Mongoose `Shipment` model:

- `shipmentReference`: Unique identifier generated as `SHP-<TIMESTAMP>-<ENTROPY>`.
- `orderId`: References the parent `Order`.
- `orderNumber`: Human-readable order identifier (e.g. `ORD-202611-001`).
- `carrierName`: Name of the assigned logistics provider.
- `carrierService`: Service tier (e.g., `Same-Day Express`, `Standard Nationwide`).
- `trackingNumber`: Carrier waybill or internal tracking reference (`CRTV-<REF>-<SUFFIX>`).
- `trackingUrl`: Optional external link to courier tracking portal.
- `status`: `ShipmentStatus` enum value.
- `destinationAddress`: Immutable snapshot of the order's shipping address.
- `dispatchedAt`: Timestamp when the package departed the dispatch center.
- `estimatedDeliveryDate`: Estimated date of arrival.
- `actualDeliveryDate`: Verified timestamp when delivery completed.
- `deliveredTo`: Name of the individual who received the shipment.
- `deliveryNotes`: Special gate or packaging notes.
- `events`: Array of append-only `ITrackingEvent` subdocuments.

---

## 2. Shipment Operations

1. **Shipment Creation (`POST /api/v1/admin/fulfilment/:orderId/shipments`):**
   - Verifies the order is paid.
   - Verifies that no active shipment already exists.
   - Resolves carrier via `CarrierProviderFactory`.
   - Generates unique tracking number if not supplied.
   - Appends initial `Shipment Created` tracking event.
   - If `dispatchNow` is enabled: sets `dispatchedAt = new Date()`, advances order to `SHIPPED`, and appends `Dispatched to Carrier` event.

2. **Shipment Update (`PATCH /api/v1/admin/shipments/:shipmentId`):**
   - Allows updating carrier, service level, tracking URL, and estimated delivery dates.
   - Syncs tracking number and carrier metadata to parent `Order`.

3. **Prevention of Duplicates:**
   - Attempting to create a second shipment for an order returns `409 CONFLICT` (`SHIPMENT_ALREADY_EXISTS`).
