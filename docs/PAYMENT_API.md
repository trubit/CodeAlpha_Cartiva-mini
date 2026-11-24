# Cartiva Mini — Payment & Financial Processing API Reference (Phase 13)

All payment endpoints are versioned under `/api/v1` and use standard `ApiResponse<T>` envelope responses.

---

## 1. Customer Endpoints

### 1.1 Initiate Payment
- **Method**: `POST /api/v1/payments/initialize`
- **Security**: Bearer JWT (Customer)
- **Request Body**:
  ```json
  {
    "orderNumber": "ORD-20261104-ABCD12",
    "callbackUrl": "http://localhost:5180/payment/callback"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Payment initialized successfully.",
    "data": {
      "paymentReference": "PAY-M8ABC12-EF34",
      "authorizationUrl": "https://checkout.paystack.com/0bc181e...",
      "accessCode": "0bc181e...",
      "orderNumber": "ORD-20261104-ABCD12",
      "amount": 227.38,
      "amountMinor": 22738,
      "currency": "NGN",
      "gateway": "paystack"
    }
  }
  ```

### 1.2 Verify Payment
- **Method**: `GET /api/v1/payments/:reference/verify`
- **Security**: Optional Bearer JWT (Allows callback queries while verifying backend-to-Paystack)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Payment status verified successfully.",
    "data": {
      "paymentReference": "PAY-M8ABC12-EF34",
      "orderNumber": "ORD-20261104-ABCD12",
      "status": "paid",
      "amount": 227.38,
      "amountMinor": 22738,
      "currency": "NGN",
      "gateway": "paystack",
      "gatewayTransactionId": "12345678",
      "channel": "card",
      "paidAt": "2026-11-04T12:00:00.000Z",
      "verifiedAt": "2026-11-04T12:00:02.000Z",
      "isOrderConfirmed": true,
      "orderStatus": "confirmed"
    }
  }
  ```

### 1.3 List My Payments
- **Method**: `GET /api/v1/payments`
- **Security**: Bearer JWT (Customer)
- **Query Parameters**: `status`, `page`, `limit`
- **Response**: `200 OK`

### 1.4 Get Payment Details
- **Method**: `GET /api/v1/payments/:reference`
- **Security**: Bearer JWT (Customer or Admin)
- **Response**: `200 OK`

### 1.5 Retry Payment
- **Method**: `POST /api/v1/payments/:reference/retry`
- **Security**: Bearer JWT (Customer)
- **Response**: `201 Created`

---

## 2. Webhook Endpoint

### 2.1 Paystack Webhook Receiver
- **Method**: `POST /api/v1/webhooks/paystack`
- **Security**: `x-paystack-signature` header (HMAC SHA512)
- **Response**: `200 OK`
  ```json
  {
    "status": true,
    "message": "Webhook received and processed."
  }
  ```

---

## 3. Administrator Endpoints

### 3.1 List All Payments
- **Method**: `GET /api/v1/admin/payments`
- **Security**: Bearer JWT (`UserRole.ADMIN`)
- **Query Parameters**: `search`, `status`, `startDate`, `endDate`, `page`, `limit`
- **Response**: `200 OK`

### 3.2 Process Refund
- **Method**: `POST /api/v1/admin/payments/:paymentId/refunds`
- **Security**: Bearer JWT (`UserRole.ADMIN`)
- **Request Body**:
  ```json
  {
    "amount": 50.00,
    "reason": "Customer cancellation prior to dispatch",
    "customerNote": "Refund credited to original payment card"
  }
  ```
- **Response**: `201 Created`

### 3.3 List Refunds
- **Method**: `GET /api/v1/admin/payments/refunds`
- **Security**: Bearer JWT (`UserRole.ADMIN`)

### 3.4 Ledger Reconciliation
- **Method**: `GET /api/v1/admin/payments/reconciliation`
- **Security**: Bearer JWT (`UserRole.ADMIN`)
- **Query Parameters**: `reference` (optional)
