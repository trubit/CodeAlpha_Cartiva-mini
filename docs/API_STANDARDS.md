# Cartiva Mini — API Design & Contract Standards

**Document Version:** 1.0.0  
**Phase:** Phase 3: Backend Foundation & Infrastructure  
**Date:** November 2026  
**Classification:** Engineering API Protocol Standard  
**Author:** Lead API Architect

---

## 1. Protocol & Versioning

All client-to-backend communication strictly follows RESTful principles over HTTPS.

- **Base URL:** `/api/v1`
- **Transport:** JSON (`application/json; charset=utf-8`)
- **Versioning Policy:** Major versioning is explicitly encoded in the URI path (`/api/v1`). Minor or non-breaking additions are introduced backward-compatibly without changing the major version prefix.

---

## 2. Resource Naming Conventions

- **URIs:** Use lowercase, hyphenated nouns for collections and resources (kebab-case):
  - `GET /api/v1/health`
  - `GET /api/v1/health/ready`
  - `GET /api/v1/products`
  - `GET /api/v1/order-items`
- **Query Parameters:** Use camelCase for query string arguments:
  - `GET /api/v1/products?page=1&limit=20&sortBy=createdAt&sortOrder=desc`
- **HTTP Methods:**
  - `GET`: Read resources without side-effects (idempotent).
  - `POST`: Create new resources or execute non-idempotent operations.
  - `PUT`: Completely replace an existing resource.
  - `PATCH`: Partially update an existing resource.
  - `DELETE`: Remove a resource.

---

## 3. Standard Response Envelopes

To eliminate uncertainty in client-side consumers, every API response conforms to a standardized JSON envelope.

### 3.1 Successful Response Envelope (`ApiResponse<T>`)

```typescript
export interface ApiResponse<T = unknown> {
  success: true;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

#### Example Success Payload:

```json
{
  "success": true,
  "message": "Service is operational.",
  "data": {
    "status": "healthy",
    "service": "cartiva-mini-api",
    "version": "1.0.0",
    "timestamp": "2026-11-02T18:25:22.000Z"
  }
}
```

---

### 3.2 Error Response Envelope (`ApiErrorResponse`)

```typescript
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    timestamp: string;
    requestId: string;
    stack?: string; // Strictly omitted in production
  };
}
```

#### Example Validation Error Payload (422 Unprocessable Entity):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for incoming request data. Please check the submitted fields.",
    "details": [
      {
        "field": "page",
        "message": "Number must be greater than or equal to 1"
      }
    ],
    "timestamp": "2026-11-02T18:25:22.000Z",
    "requestId": "f8a7e3d1-4c2b-4e1a-9f5e-123456789abc"
  }
}
```

---

## 4. HTTP Status Code Catalog

| HTTP Status | Name                      | Typical Usage in Cartiva Mini                                  |
| :---------- | :------------------------ | :------------------------------------------------------------- |
| `200`       | **OK**                    | Successful read, update, or diagnostic query.                  |
| `201`       | **Created**               | Successful creation of an order, account, or review.           |
| `204`       | **No Content**            | Successful deletion or empty response.                         |
| `400`       | **Bad Request**           | Malformed JSON syntax, invalid query formats.                  |
| `401`       | **Unauthorized**          | Missing, invalid, or expired JWT access token.                 |
| `403`       | **Forbidden**             | Valid token, but user lacks necessary permissions / RBAC role. |
| `404`       | **Not Found**             | Target resource ID or unmapped API route does not exist.       |
| `409`       | **Conflict**              | Resource duplicate (e.g. email already registered).            |
| `413`       | **Payload Too Large**     | Request body exceeds the 1MB payload ceiling.                  |
| `422`       | **Unprocessable Entity**  | Zod input schema validation failure with field breakdown.      |
| `429`       | **Too Many Requests**     | Exceeded rate limit thresholds (standard: 120/min).            |
| `500`       | **Internal Server Error** | Unexpected server bug or programming defect.                   |
| `501`       | **Not Implemented**       | Roadmap feature not yet available in current phase.            |
| `503`       | **Service Unavailable**   | Critical dependency (database, payment provider) disconnected. |

---

## 5. User-Facing Error Message Standards

In accordance with Cartiva Mini brand voice:

- Error messages must explain **what happened** and **what the user can do next**.
- Never expose database queries, raw table names, or internal stack traces to clients.
- Messages must be grammatically flawless, natural, and helpful.
