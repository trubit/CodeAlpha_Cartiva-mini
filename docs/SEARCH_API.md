# Product Search & Discovery API Specification

## 1. Overview

Cartiva Mini provides RESTful, versioned endpoints (`/api/v1`) for product discovery, keyword search, autocomplete suggestions, and category navigation. All public endpoints enforce published-only status filtering and output sanitized DTOs that conceal internal inventory reserve structures and administrative metadata.

---

## 2. API Endpoints

### 2.1 Full-Text Product Search

- **Endpoint:** `GET /api/v1/products/search`
- **Description:** Performs full-text keyword search across products with facet breakdowns (categories, brands, price extremes, stock status) and dynamic filters.
- **Query Parameters:**

  | Parameter      | Type   | Required | Description                              | Example        |
  | -------------- | ------ | -------- | ---------------------------------------- | -------------- |
  | `q`            | string | Yes      | Search query (1–100 chars)               | `leather bag`  |
  | `page`         | number | No       | Page index (default: 1)                  | `1`            |
  | `limit`        | number | No       | Items per page (default: 20, max: 100)   | `20`           |
  | `category`     | string | No       | Category ObjectId or Slug                | `bags-wallets` |
  | `minPrice`     | number | No       | Minimum price filter                     | `50`           |
  | `maxPrice`     | number | No       | Maximum price filter                     | `250`          |
  | `currency`     | string | No       | Currency code (default: USD)             | `USD`          |
  | `brand`        | string | No       | Brand name filter                        | `AuraCraft`    |
  | `availability` | string | No       | `all`, `in_stock`, `out_of_stock`        | `in_stock`     |
  | `sort`         | string | No       | `relevance`, `price_asc`, `newest`, etc. | `relevance`    |

- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Products retrieved successfully",
    "data": {
      "products": [
        {
          "_id": "672401f81f18e285a81e9f1a",
          "title": "Vintage Leather Bag",
          "slug": "vintage-leather-bag",
          "brand": "AuraCraft",
          "regularPrice": 120,
          "salePrice": 99,
          "currency": "USD",
          "isAvailable": true,
          "images": [...]
        }
      ],
      "facets": {
        "categories": [{ "_id": "6724...", "name": "Bags", "slug": "bags", "count": 12 }],
        "brands": [{ "brand": "AuraCraft", "count": 8 }],
        "priceRange": { "min": 45, "max": 320 },
        "inStockCount": 18,
        "outOfStockCount": 2
      },
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 20,
        "pages": 1,
        "hasNextPage": false,
        "hasPrevPage": false
      }
    }
  }
  ```

---

### 2.2 Autocomplete & Search Suggestions

- **Endpoint:** `GET /api/v1/products/suggestions`
- **Description:** Returns fast prefix and keyword suggestions spanning products, matching categories, and matching brands.
- **Query Parameters:**

  | Parameter | Type   | Required | Description                         | Example |
  | --------- | ------ | -------- | ----------------------------------- | ------- |
  | `q`       | string | Yes      | Query string (1–100 chars)          | `vint`  |
  | `limit`   | number | No       | Suggestion limit (1–20, default: 8) | `8`     |

- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Suggestions retrieved successfully",
    "data": {
      "products": [
        { "_id": "6724...", "title": "Vintage Leather Bag", "slug": "vintage-leather-bag" }
      ],
      "categories": [
        { "_id": "6723...", "name": "Vintage Accessories", "slug": "vintage-accessories" }
      ],
      "brands": ["VintageWorks"]
    }
  }
  ```

---

### 2.3 New Arrivals Discovery

- **Endpoint:** `GET /api/v1/products/new-arrivals`
- **Description:** Returns the most recently published products sorted by `createdAt: -1`.
- **Query Parameters:**

  | Parameter | Type   | Required | Description                      | Example |
  | --------- | ------ | -------- | -------------------------------- | ------- |
  | `limit`   | number | No       | Max products (1–50, default: 10) | `10`    |

- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "New arrivals retrieved successfully",
    "data": [ ... ]
  }
  ```

---

### 2.4 Featured Products Discovery

- **Endpoint:** `GET /api/v1/products/featured`
- **Description:** Returns published products marked as `isFeatured: true`.
- **Query Parameters:**
  | Parameter | Type   | Required | Description                     | Example |
  | --------- | ------ | -------- | ------------------------------- | ------- |
  | `limit`   | number | No       | Max products (1–50, default: 8) | `8`     |

---

### 2.5 Category Products Navigation

- **Endpoint:** `GET /api/v1/categories/:slug/products`
- **Description:** Returns paginated products belonging to the specified category or any of its active subcategories.
- **Route Parameters:**

  | Parameter | Type   | Description                     |
  | --------- | ------ | ------------------------------- |
  | `slug`    | string | Category slug (e.g. `footwear`) |

- **Query Parameters:** Supports standard filtering (`minPrice`, `maxPrice`, `brand`, `availability`, `sort`, `page`, `limit`).

---

## 3. Error Responses

- **HTTP 400 Bad Request:** Empty query parameter or invalid format.
- **HTTP 404 Not Found:** Category slug or product slug does not exist or is inactive.
- **HTTP 422 Unprocessable Entity:** Zod validation failure (e.g., `maxPrice` is strictly less than `minPrice`).
  ```json
  {
    "success": false,
    "statusCode": 422,
    "message": "Validation failed",
    "errors": [
      {
        "field": "maxPrice",
        "message": "maxPrice must be greater than or equal to minPrice"
      }
    ]
  }
  ```
