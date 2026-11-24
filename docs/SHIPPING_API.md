# Cartiva Mini — Shipping & Delivery API Specification

## 1. Base URL & Protocol

- **Base URL:** `/api/v1`
- **Format:** JSON (`application/json`)
- **Authentication:** Bearer JWT in `Authorization` header for protected routes.

---

## 2. Customer Endpoints

### 2.1 List Available Shipping Methods

- **Route:** `GET /api/v1/shipping/methods`
- **Authentication:** Public
- **Query Parameters:**
  - `country` (string, optional, default: `'Nigeria'`): Destination country.
  - `state` (string, optional): Destination state/region.
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "673f8a...",
        "methodName": "Standard Delivery",
        "description": "Reliable ground transit",
        "calculationType": "flat",
        "baseRateMinor": 250000,
        "baseRate": 2500,
        "currency": "NGN",
        "estimatedMinDays": 2,
        "estimatedMaxDays": 4,
        "estimatedDeliveryText": "2–4 business days",
        "freeShippingThresholdMinor": 5000000,
        "freeShippingThreshold": 50000
      }
    ]
  }
  ```

---

### 2.2 Check Shipping Availability

- **Route:** `GET /api/v1/shipping/availability`
- **Authentication:** Public
- **Query Parameters:**
  - `country` (string, required): Destination country.
  - `state` (string, required): Destination state or region.
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "isDeliverable": true,
      "country": "Nigeria",
      "state": "Lagos",
      "availableMethodsCount": 2,
      "message": "Delivery is available to Lagos, Nigeria with 2 shipping method(s)."
    }
  }
  ```

---

### 2.3 Calculate Authoritative Shipping Quotes

- **Route:** `POST /api/v1/shipping/quotes`
- **Authentication:** Optional (Customer or Guest)
- **Request Body (Option A: Saved Address):**
  ```json
  {
    "addressId": "673f8b..."
  }
  ```
- **Request Body (Option B: Guest / Manual Destination):**
  ```json
  {
    "destination": {
      "country": "Nigeria",
      "state": "Lagos",
      "city": "Ikeja",
      "street": "12 Awolowo Road"
    },
    "items": [
      {
        "productId": "673f8c...",
        "quantity": 2,
        "unitPrice": 15000,
        "weightGrams": 500
      }
    ]
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "isDeliverable": true,
      "destination": {
        "country": "Nigeria",
        "state": "Lagos",
        "city": "Ikeja"
      },
      "subtotalMinor": 3000000,
      "totalWeightKg": 1.0,
      "currency": "NGN",
      "quotes": [
        {
          "methodId": "673f8a...",
          "methodName": "Standard Delivery",
          "feeMinor": 250000,
          "fee": 2500,
          "currency": "NGN",
          "estimatedMinDays": 2,
          "estimatedMaxDays": 4,
          "estimatedDeliveryText": "2–4 business days",
          "isFreeShipping": false,
          "qualifiesForFreeShipping": false
        }
      ]
    }
  }
  ```

---

## 3. Administrator Endpoints (`UserRole.ADMIN`)

### 3.1 List All Configurations

- **Route:** `GET /api/v1/admin/shipping/configurations`
- **Query Parameters:**
  - `zoneName` (string, optional)
  - `methodName` (string, optional)
  - `isActive` (`true` | `false`, optional)
- **Response (`200 OK`):** Paginated or full list of configurations.

### 3.2 Create Shipping Configuration

- **Route:** `POST /api/v1/admin/shipping/configurations`
- **Request Body:**
  ```json
  {
    "zoneName": "Lagos Metro Zone",
    "methodName": "Express Courier",
    "description": "Same-day courier delivery",
    "countriesCovered": ["Nigeria"],
    "statesCovered": ["Lagos"],
    "calculationType": "flat",
    "baseRateMinor": 450000,
    "currency": "NGN",
    "estimatedMinDays": 1,
    "estimatedMaxDays": 1,
    "isActive": true
  }
  ```
- **Response (`201 Created`):** Newly created configuration record.

### 3.3 Get Configuration Detail

- **Route:** `GET /api/v1/admin/shipping/configurations/:id`
- **Response (`200 OK`):** Full configuration details.

### 3.4 Update Configuration

- **Route:** `PATCH /api/v1/admin/shipping/configurations/:id`
- **Request Body:** Partial configuration object.
- **Response (`200 OK`):** Updated configuration record.

### 3.5 Toggle Active Status

- **Route:** `PATCH /api/v1/admin/shipping/configurations/:id/status`
- **Request Body:** `{ "isActive": false }`
- **Response (`200 OK`):** Updated configuration record.

### 3.6 Delete Configuration

- **Route:** `DELETE /api/v1/admin/shipping/configurations/:id`
- **Response (`200 OK`):** Deletion confirmation message.

---

## 4. Error Codes & HTTP Statuses

| Error Code                          | HTTP Status                       | Description                                                                    |
| :---------------------------------- | :-------------------------------- | :----------------------------------------------------------------------------- |
| `VALIDATION_ERROR`                  | `400` / `422`                     | Request body or query parameters failed Zod schema validation                  |
| `SHIPPING_CONFIG_NOT_FOUND`         | `404`                             | Configuration ID does not exist                                                |
| `SHIPPING_UNAVAILABLE_FOR_LOCATION` | `404` / `200 isDeliverable:false` | No active shipping zones cover the requested destination                       |
| `ADDRESS_NOT_FOUND`                 | `404`                             | The requested `addressId` was not found in database                            |
| `ADDRESS_ACCESS_DENIED`             | `403`                             | Customer attempted to access or quote against an address owned by another user |
| `FORBIDDEN`                         | `403`                             | Non-admin user attempted to access administrative endpoints                    |
| `UNAUTHORIZED`                      | `401`                             | Missing or invalid Bearer JWT token                                            |
