# Checkout API Specification — Cartiva Mini (Phase 12)

All checkout endpoints reside under the `/api/v1/checkout` prefix and require authenticated customer access (`Authorization: Bearer <token>`).

---

## 1. Endpoints Overview

| Method  | Endpoint                            | Description                                                     |
| ------- | ----------------------------------- | --------------------------------------------------------------- |
| `POST`  | `/api/v1/checkout/session`          | Creates or initializes active checkout session from cart        |
| `GET`   | `/api/v1/checkout/session`          | Retrieves active checkout session and current items snapshot    |
| `PATCH` | `/api/v1/checkout/session/address`  | Binds delivery destination address to session                   |
| `PATCH` | `/api/v1/checkout/session/shipping` | Binds shipping method and calculates authoritative shipping fee |
| `GET`   | `/api/v1/checkout/session/summary`  | Retrieves comprehensive authoritative financial summary         |
| `POST`  | `/api/v1/checkout/validate`         | Pre-flight checkout integrity check                             |
| `POST`  | `/api/v1/checkout/confirm`          | Atomically reserves stock and creates order                     |

---

## 2. Detailed Endpoints

### 2.1 Initialize Checkout Session

`POST /api/v1/checkout/session`

- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Checkout session initialized successfully.",
  "data": {
    "sessionId": "4b6a9821-ff55-466d-89ad-97f2efbb4f11",
    "step": "review",
    "subtotalMinor": 9000000,
    "shippingFeeMinor": 0,
    "totalAmountMinor": 9000000,
    "currency": "NGN",
    "cart": {
      "itemCount": 2,
      "items": [
        {
          "id": "6727daef1234567890abcdef",
          "sku": "HEADPHONES-001",
          "title": "Noise Cancelling Headphones",
          "unitPriceMinor": 4500000,
          "quantity": 2,
          "lineTotalMinor": 9000000
        }
      ]
    },
    "expiresAt": "2026-11-03T22:30:00.000Z"
  }
}
```

- **Error Codes:**
  - `CHECKOUT_EMPTY_CART` (400): Customer's cart contains no items.

---

### 2.2 Select Delivery Address

`PATCH /api/v1/checkout/session/address`

- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body:**

```json
{
  "addressId": "6727dd991234567890abcdef"
}
```

- **Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Delivery address bound to checkout session.",
  "data": {
    "step": "shipping",
    "shippingAddressSnapshot": {
      "recipientName": "Folake Adeleke",
      "phone": "+2348033445566",
      "streetAddress": "14 Admiralty Way, Lekki Phase 1",
      "city": "Lekki",
      "state": "Lagos",
      "country": "Nigeria"
    }
  }
}
```

- **Error Codes:**
  - `FORBIDDEN` (403): Address does not belong to the authenticated customer.
  - `NOT_FOUND` (404): Address record does not exist.

---

### 2.3 Select Shipping Method

`PATCH /api/v1/checkout/session/shipping`

- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body:**

```json
{
  "shippingMethodId": "6727deaa1234567890abcdef"
}
```

- **Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Shipping method selected and fee computed.",
  "data": {
    "step": "payment",
    "shippingFeeMinor": 250000,
    "totalAmountMinor": 9250000,
    "shippingMethodSnapshot": {
      "methodId": "6727deaa1234567890abcdef",
      "methodName": "Standard Express Delivery",
      "carrierName": "SpeedyLogistics",
      "feeMinor": 250000,
      "currency": "NGN",
      "estimatedDeliveryText": "1–3 business days",
      "isFreeShipping": false
    }
  }
}
```

---

### 2.4 Checkout Summary

`GET /api/v1/checkout/session/summary`

- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "sessionId": "4b6a9821-ff55-466d-89ad-97f2efbb4f11",
    "items": [...],
    "subtotalMinor": 9000000,
    "shippingFeeMinor": 250000,
    "discountAmountMinor": 0,
    "taxAmountMinor": 0,
    "totalAmountMinor": 9250000,
    "currency": "NGN",
    "isReadyForConfirmation": true,
    "validationIssues": []
  }
}
```

---

### 2.5 Confirm Order & Reserve Stock

`POST /api/v1/checkout/confirm`

- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body:**

```json
{
  "acceptTerms": true,
  "customerNotes": "Please ring front bell upon arrival."
}
```

- **Response (201 Created):**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Order created successfully. Inventory reserved pending payment.",
  "data": {
    "orderId": "6727e02b1234567890abcdef",
    "orderNumber": "ORD-20261103-9F8K2M",
    "totalAmount": 92500,
    "totalAmountMinor": 9250000,
    "currency": "NGN",
    "orderStatus": "pending_payment",
    "paymentStatus": "pending",
    "reservationReference": "RES-20261103-A8F1C3",
    "nextStep": "payment_gateway_phase13"
  }
}
```

- **Error Codes:**
  - `VALIDATION_ERROR` (400): `acceptTerms` is false.
  - `CHECKOUT_INCOMPLETE` (400): Missing delivery address or shipping method.
  - `INVENTORY_RESERVATION_FAILED` (400): Insufficient inventory for one or more items.
