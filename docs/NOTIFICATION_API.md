# Notification & Customer Communication API Reference — Cartiva Mini

## Base URL
`/api/v1`

---

## Customer Notification Endpoints

### 1. List In-App Notifications
- **Method:** `GET`
- **Route:** `/notifications`
- **Auth:** Required (Customer, Staff, Admin)
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 100)
  - `isRead` (boolean, optional)
  - `type` (NotificationType enum, optional)
- **Response:**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "6aedcc...",
        "type": "ORDER_CONFIRMED",
        "title": "Order Confirmed — #ORD-1001",
        "message": "Your order has been confirmed.",
        "priority": "normal",
        "actionUrl": "/orders/ORD-1001",
        "isRead": false,
        "createdAt": "2026-11-06T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
  ```

### 2. Get Unread Count
- **Method:** `GET`
- **Route:** `/notifications/unread-count`
- **Auth:** Required
- **Response:**
  ```json
  {
    "status": "success",
    "data": {
      "unreadCount": 3
    }
  }
  ```

### 3. Mark Notification as Read
- **Method:** `PATCH`
- **Route:** `/notifications/:notificationId/read`
- **Auth:** Required
- **Response:**
  ```json
  {
    "status": "success",
    "data": {
      "id": "6aedcc...",
      "isRead": true,
      "readAt": "2026-11-06T12:05:00.000Z"
    }
  }
  ```

### 4. Mark All Notifications as Read
- **Method:** `PATCH`
- **Route:** `/notifications/read-all`
- **Auth:** Required
- **Response:**
  ```json
  {
    "status": "success",
    "data": {
      "modifiedCount": 3
    }
  }
  ```

### 5. Delete Notification
- **Method:** `DELETE`
- **Route:** `/notifications/:notificationId`
- **Auth:** Required
- **Response:**
  ```json
  {
    "status": "success",
    "data": {
      "deleted": true
    }
  }
  ```

### 6. Get Communication Preferences
- **Method:** `GET`
- **Route:** `/notifications/preferences`
- **Auth:** Required
- **Response:**
  ```json
  {
    "status": "success",
    "data": {
      "orderUpdates": true,
      "securityAlerts": true,
      "promotionalEmails": false,
      "productUpdates": false,
      "newsletter": false,
      "emailEnabled": true,
      "inAppAlerts": true,
      "smsAlerts": false,
      "pushAlerts": false
    }
  }
  ```

### 7. Update Communication Preferences
- **Method:** `PATCH`
- **Route:** `/notifications/preferences`
- **Auth:** Required
- **Body:**
  ```json
  {
    "promotionalEmails": true,
    "newsletter": true
  }
  ```

---

## Administrative Notification Endpoints

### 8. List Outbox Notifications
- **Method:** `GET`
- **Route:** `/admin/notifications`
- **Auth:** Required (Admin, Staff)
- **Query Parameters:** `page`, `limit`, `status`, `channel`, `search`

### 9. Get Outbox Notification Detail
- **Method:** `GET`
- **Route:** `/admin/notifications/:notificationId`
- **Auth:** Required (Admin, Staff)

### 10. Manually Retry Failed Job
- **Method:** `POST`
- **Route:** `/admin/notifications/:notificationId/retry`
- **Auth:** Required (Admin, Staff)
- **Response:**
  ```json
  {
    "status": "success",
    "data": {
      "outboxId": "6aedcc...",
      "status": "pending",
      "attempts": 0
    }
  }
  ```

### 11. List Registered Templates Catalog
- **Method:** `GET`
- **Route:** `/admin/notifications/templates`
- **Auth:** Required (Admin, Staff)
