# Shopping Cart & Wishlist API Specification

## 1. Overview

The Shopping Cart & Wishlist APIs (`/api/v1/cart` and `/api/v1/wishlist`) provide versioned RESTful endpoints for cart operations, guest cart token propagation, cart merging, and customer wishlist bookmarks.

---

## 2. Shopping Cart Endpoints

### 2.1 Retrieve Current Cart

- **Endpoint:** `GET /api/v1/cart`
- **Authentication:** Optional (supports both authenticated Bearer token and `x-guest-cart-token`).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Shopping cart retrieved successfully.",
    "data": {
      "id": "672412e...",
      "items": [
        {
          "id": "672412e...",
          "productId": "672401f...",
          "sku": "KEY-ERG-001",
          "title": "Ergonomic Mechanical Keyboard",
          "unitPrice": 39000,
          "unitPriceMinor": 3900000,
          "quantity": 2,
          "lineTotal": 78000,
          "lineTotalMinor": 7800000,
          "currency": "NGN",
          "isAvailable": true,
          "availableStock": 18
        }
      ],
      "itemCount": 2,
      "subtotal": 78000,
      "subtotalMinor": 7800000,
      "discountAmount": 0,
      "total": 78000,
      "currency": "NGN",
      "hasUnavailableItems": false,
      "hasPriceChanges": false
    }
  }
  ```

---

### 2.2 Add Item to Cart

- **Endpoint:** `POST /api/v1/cart/items`
- **Authentication:** Optional.
- **Request Body:**
  ```json
  {
    "productId": "672401f81f18e285a81e9f1a",
    "variantId": "672401f81f18e285a81e9f1b",
    "quantity": 1
  }
  ```
- **Validation Rules:**
  - `productId`: Valid 24-char hex MongoDB ObjectId.
  - `variantId`: Optional valid 24-char hex MongoDB ObjectId.
  - `quantity`: Integer between 1 and 99 (default: 1).
- **Responses:**
  - `200 OK`: Item added or quantity incremented.
  - `400 Bad Request`: `INSUFFICIENT_STOCK` (requested quantity exceeds available inventory).
  - `404 Not Found`: Product not found or unpublished.
  - `422 Unprocessable Entity`: Validation failure.

---

### 2.3 Update Item Quantity

- **Endpoint:** `PATCH /api/v1/cart/items/:itemId`
- **Authentication:** Optional.
- **Request Body:**
  ```json
  {
    "quantity": 3
  }
  ```
- **Responses:**
  - `200 OK`: Quantity updated.
  - `400 Bad Request`: `INSUFFICIENT_STOCK`.
  - `404 Not Found`: Cart item not found.

---

### 2.4 Remove Item from Cart

- **Endpoint:** `DELETE /api/v1/cart/items/:itemId`
- **Authentication:** Optional.
- **Responses:**
  - `200 OK`: Item removed, updated cart returned.
  - `404 Not Found`: Cart item not found.

---

### 2.5 Clear Shopping Cart

- **Endpoint:** `DELETE /api/v1/cart`
- **Authentication:** Optional.
- **Responses:**
  - `200 OK`: Cart emptied, zeroed cart returned.

---

### 2.6 Merge Guest Cart into Customer Cart

- **Endpoint:** `POST /api/v1/cart/merge`
- **Authentication:** Required (`Bearer <token>`).
- **Request Body:**
  ```json
  {
    "guestCartToken": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Guest cart merged successfully.",
    "data": {
      "cart": { ... },
      "mergeSummary": {
        "mergedItemsCount": 2,
        "updatedItemsCount": 1,
        "unavailableItemsCount": 0
      }
    }
  }
  ```

---

## 3. Customer Wishlist Endpoints

### 3.1 Retrieve Wishlist

- **Endpoint:** `GET /api/v1/wishlist`
- **Authentication:** Required (`Bearer <token>`).

### 3.2 Add Product to Wishlist

- **Endpoint:** `POST /api/v1/wishlist/items`
- **Authentication:** Required.
- **Request Body:** `{ "productId": "6724..." }`

### 3.3 Remove Item from Wishlist

- **Endpoint:** `DELETE /api/v1/wishlist/items/:itemId`
- **Authentication:** Required.

### 3.4 Move Wishlist Item to Shopping Cart

- **Endpoint:** `POST /api/v1/wishlist/items/:itemId/move-to-cart`
- **Authentication:** Required.
- **Request Body (Optional):** `{ "variantId": "6724...", "quantity": 1 }`
- **Response (200 OK):** Returns `{ cart: CartDto, wishlist: WishlistDto }`.
