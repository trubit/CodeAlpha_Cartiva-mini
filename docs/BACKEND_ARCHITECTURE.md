# Cartiva Mini — Backend Architecture Specification

**Document Version:** 1.0.0  
**Phase:** Phase 3: Backend Foundation & Infrastructure  
**Date:** November 2026  
**Classification:** Core System Architecture  
**Author:** Senior Backend Architect & Node.js Specialist

---

## 1. Architectural Philosophy

Cartiva Mini is engineered as a **modular monolith** in Node.js and TypeScript, designed to balance rapid feature development with high maintainability, strict security boundaries, and future horizontal scalability.

The architecture strictly decouples:

- **Transport / Protocol Handling:** HTTP routing, middleware, headers, and parameter parsing.
- **Request Validation:** Strict schema validation via Zod before business execution.
- **Business Domain Logic:** Isolated domain modules (prepared for future phases).
- **Data Persistence:** Dedicated Mongoose connection boundaries (deferred to Phase 4).
- **Cross-Cutting Concerns:** Centralized correlation tracing, security headers, rate limiting, and error formatting.

---

## 2. Directory Layout & Subsystem Responsibilities

```text
backend/
└── src/
    ├── config/                 # Centralized, environment-driven configurations
    │   ├── env.ts              # Zod-validated environment schema & safe defaults
    │   ├── cors.ts             # Strict origin allowlisting and preflight handling
    │   ├── security.ts         # Helmet CSP, HSTS, and frame protections
    │   ├── logger.ts           # Structured Pino logger with pino-pretty in dev
    │   └── database.ts         # MongoDB connection boundary & graceful cleanup
    │
    ├── constants/              # Immutable protocol and error dictionaries
    │   ├── httpStatusCodes.ts  # Standard HTTP status code constants
    │   ├── errorCodes.ts       # Categorized application error codes
    │   └── index.ts            # Constants barrel export
    │
    ├── controllers/            # HTTP request/response handlers
    │   └── health.controller.ts# Liveness and readiness diagnostic endpoints
    │
    ├── middleware/             # Express pipeline interceptors
    │   ├── request-id.middleware.ts  # Correlation ID (UUIDv4) generator & propagator
    │   ├── security.middleware.ts    # Helmet & CORS attachment
    │   ├── rate-limit.middleware.ts  # Tiered API rate limiting
    │   ├── logger.middleware.ts      # Duration & diagnostic structured request logger
    │   ├── validation.middleware.ts  # Generic Zod body, query, and param validator
    │   ├── not-found.middleware.ts   # 404 handler returning standardized error envelopes
    │   └── error.middleware.ts       # Centralized error handler & secret sanitization
    │
    ├── routes/                 # Versioned route definitions
    │   ├── index.ts            # Central API route registry (/api/v1)
    │   ├── health.routes.ts    # /health and /health/ready probes
    │   └── docs.routes.ts      # OpenAPI 3.0.3 specification & Swagger UI
    │
    ├── utils/                  # Reusable utility functions and base classes
    │   ├── AppError.ts         # Operational error class with status & error codes
    │   ├── response.util.ts    # Standardized ApiResponse<T> senders
    │   └── asyncHandler.util.ts# Safe async controller wrapper
    │
    ├── validators/             # Reusable Zod input schemas
    │   ├── common.validator.ts # Pagination, sorting, and ObjectId schemas
    │   └── index.ts            # Validators barrel export
    │
    ├── types/                  # Backend-specific TypeScript interfaces
    │   └── index.ts            # Type definitions barrel export
    │
    ├── app.ts                  # Express application factory & middleware ordering
    └── server.ts               # HTTP server listener, lifecycle & process traps
```

---

## 3. The HTTP Request Lifecycle

Every inbound request flows through a deterministic, layered pipeline:

```
[Inbound Client Request]
         │
         ▼
[1. Proxy Trust Check]           app.set('trust proxy', 1)
         │
         ▼
[2. Correlation Tracing]         Assigns / preserves X-Request-ID (UUIDv4)
         │
         ▼
[3. Security Headers & CORS]     Helmet (CSP, HSTS) & strict origin check
         │
         ▼
[4. Rate Limiter]                Standard (120 req/min) or Strict tier
         │
         ▼
[5. Body & Cookie Parsing]       express.json({ limit: '1mb' }), cookieParser
         │
         ▼
[6. Diagnostic Request Logger]   Tracks start time; logs completion on finish
         │
         ▼
[7. Route Registry (/api/v1)]    Versioned API routing
         │
         ├───▶ [Route-Specific Validation]  validateRequest({ body, query, params })
         │                  │
         │                  ▼
         │            [Controller Action]   Executes logic, calls sendSuccess()
         │
         ▼
[8. 404 Route Not Found]         Intercepts unmapped routes with AppError (404)
         │
         ▼
[9. Centralized Error Handler]   Catches AppError, ZodError, SyntaxError, Mongoose;
                                 sanitizes logs, returns standard ApiErrorResponse
```

---

## 4. Route Organization Strategy for Future Phases

The central router in `backend/src/routes/index.ts` coordinates all API v1 endpoints. In Phase 3, only core infrastructure (`/health` and `/docs`) is active. Future domains map directly to dedicated roadmap phases:

| Future Domain Module          | Planned Route Mount                                     | Scheduled Implementation Phase                      |
| :---------------------------- | :------------------------------------------------------ | :-------------------------------------------------- |
| **Authentication & Accounts** | `/api/v1/auth`, `/api/v1/users`                         | Phase 5: Authentication & Authorization             |
| **Product Catalog**           | `/api/v1/products`, `/api/v1/categories`                | Phase 6: Product Catalog & Category Architecture    |
| **Cart & Inventory**          | `/api/v1/cart`, `/api/v1/wishlist`, `/api/v1/inventory` | Phase 7: Shopping Cart & Inventory Synchronization  |
| **Order Management**          | `/api/v1/orders`, `/api/v1/checkout`                    | Phase 8: Order Processing & State Engine            |
| **Payment Gateway**           | `/api/v1/payments`                                      | Phase 9: Payment Processing (Paystack Integration)  |
| **Shipping Logistics**        | `/api/v1/shipping`                                      | Phase 10: Shipping, Fulfillment & Delivery Tracking |
| **Reviews & Ratings**         | `/api/v1/reviews`                                       | Phase 11: Customer Reviews & Ratings Engine         |
| **Promotions & Coupons**      | `/api/v1/coupons`                                       | Phase 12: Promotions, Discounts & Coupon Engine     |
| **Notifications**             | `/api/v1/notifications`                                 | Phase 13: Customer Communications & Notifications   |
| **Admin Operations**          | `/api/v1/admin`                                         | Phase 14: Merchant Admin & Analytics Dashboard      |
| **Customer Support**          | `/api/v1/support`                                       | Phase 15: Customer Support & Live Ticket System     |

---

## 5. Server Lifecycle & Graceful Shutdown

The backend manages process lifecycle via `backend/src/server.ts`:

1. **Startup Validation:** Pre-validates environment variables via Zod before opening the network port.
2. **Termination Traps:** Listens for `SIGTERM` and `SIGINT` signals.
3. **Connection Draining:** Immediately calls `server.close()` to stop accepting new HTTP connections while completing existing requests.
4. **Resource Cleanup:** Executes `disconnectDatabase()` from `config/database.ts` to release active database connections cleanly.
5. **Safety Timeout:** Enforces a 10-second unref timeout to prevent zombie processes during hanging operations.
6. **Fatal Process Traps:** Captures `uncaughtException` and `unhandledRejection`, logging full structured diagnostics with Pino before an orderly exit.
