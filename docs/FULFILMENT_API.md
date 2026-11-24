# Cartiva Mini — Fulfilment & Tracking API Reference
**Phase 14: Order Fulfilment & Tracking**

---

## 1. Customer Endpoints

### `GET /api/v1/orders/:orderId/fulfilment`
- **Description:** Returns high-level fulfilment status and carrier waybill reference.
- **Security:** Requires customer JWT authentication. Strictly verifies customer ownership (`order.userId === req.user.id`).

### `GET /api/v1/orders/:orderId/tracking`
- **Description:** Returns complete delivery timeline, carrier details, and destination address snapshot.
- **Security:** Requires customer JWT authentication.

---

## 2. Administrator & Staff Endpoints

### `GET /api/v1/admin/fulfilment`
- **Description:** Paginated queue of orders eligible for or currently undergoing fulfilment.
- **Security:** Requires `admin` or `staff` role.
- **Query Params:** `status`, `search`, `carrier`, `startDate`, `endDate`, `page`, `limit`.

### `GET /api/v1/admin/fulfilment/:orderId`
- **Description:** Complete order details, destination snapshot, shipment details, and timeline history.
- **Security:** Requires `admin` or `staff` role.

### `PATCH /api/v1/admin/fulfilment/:orderId/status`
- **Description:** Advances order fulfilment status through state machine.
- **Security:** Requires `admin` or `staff` role.
- **Payload:** `{ status: OrderStatus, notes?: string, location?: string }`

### `POST /api/v1/admin/fulfilment/:orderId/shipments`
- **Description:** Creates formal shipment record for paid order.
- **Security:** Requires `admin` or `staff` role.
- **Payload:** `{ carrierName: string, carrierService?: string, trackingNumber?: string, trackingUrl?: string, estimatedDeliveryDate?: string, deliveryNotes?: string, dispatchNow?: boolean }`

### `PATCH /api/v1/admin/shipments/:shipmentId`
- **Description:** Updates carrier or waybill attributes.
- **Security:** Requires `admin` or `staff` role.

### `POST /api/v1/admin/shipments/:shipmentId/events`
- **Description:** Appends an immutable tracking event to the shipment.
- **Security:** Requires `admin` or `staff` role.
- **Payload:** `{ status: ShipmentStatus, title: string, description: string, location?: string, timestamp?: string }`

### `POST /api/v1/admin/shipments/:shipmentId/delivery-confirmation`
- **Description:** Records proof of delivery and marks order `DELIVERED`.
- **Security:** Requires `admin` or `staff` role.
- **Payload:** `{ deliveredTo: string, deliveryNotes?: string, actualDeliveryDate?: string, proofOfDeliveryUrl?: string }`

### `POST /api/v1/admin/shipments/:shipmentId/exceptions`
- **Description:** Records delivery issue and failure reason.
- **Security:** Requires `admin` or `staff` role.
- **Payload:** `{ exceptionType: DeliveryExceptionType, description: string, location?: string, rescheduledDeliveryDate?: string }`
