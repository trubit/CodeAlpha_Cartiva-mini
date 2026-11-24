# Cartiva Mini — System Architecture Specification

**Document Version:** 1.0.0  
**Phase:** Phase 1: Project Discovery, Architecture & Technical Planning  
**Date:** November 2026  
**Author:** Senior Full-Stack Software Architect & Application Security Lead  
**Classification:** Technical Architecture Deliverable

---

## 1. System Overview & Architectural Paradigm

Cartiva Mini is designed as a high-performance, modular full-stack e-commerce platform. It provides seamless shopping, ordering, and customer management capabilities for shoppers, accompanied by a comprehensive administrative dashboard for store managers, inventory controllers, and support personnel.

### The Modular Monolith Strategy

Rather than adopting premature distributed microservices—which introduce network latency, distributed transaction complexities, deployment overhead, and data consistency challenges—Cartiva Mini utilizes a **Modular Monolith** architecture:

1. **Unified Codebase & Single Deployment Boundary:** Frontend and backend reside within a single synchronized repository with a single root `package.json`, unified dependency resolution, and coordinated build pipelines.
2. **Domain-Driven Module Boundaries:** The backend is organized into strictly decoupled domain modules (Auth, Users, Products, Categories, Cart, Wishlist, Orders, Payments, Inventory, Reviews, Coupons, Shipping, Support, Audit). Each module encapsulates its own controllers, services, models, validators, and route handlers.
3. **Internal Decoupling with Shared Contracts:** Modules communicate internally through well-defined service interfaces rather than raw database cross-queries, paving the way for effortless microservice extraction if future platform scale warrants it.
4. **Shared Type System:** A dedicated `shared/types` directory guarantees that TypeScript interfaces for request/response payloads, domain entities, enums, and validation schemas remain 100% synchronized across client and server.

---

## 2. High-Level System Architecture Diagram

The diagram below illustrates the end-to-end component topology, data flows, security boundaries, and external third-party integrations comprising the Cartiva Mini ecosystem.

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Presentation Layer (Browser / Mobile Web)"]
        direction TB
        subgraph CustomerExperience ["Customer Storefront Experience"]
            CustUI["Customer UI (Catalog, Product View, Cart, Checkout, Account)"]
        end
        subgraph AdminExperience ["Merchant Operations Experience"]
            AdminUI["Admin Dashboard (Catalog, Orders, Inventory, Reports, Users)"]
        end
    end

    subgraph FrontendFramework ["React 18/19 Single Page Application (Vite + TypeScript)"]
        direction TB
        Router["React Router v6 (Protected & Role Guards)"]
        StateLayer["State Management: Zustand (Local/UI) + TanStack Query (Server State)"]
        UILayer["UI Engine: MUI v6 + React-Bootstrap + Vanilla CSS Tokens"]
        APIClient["Axios HTTP Client (Interceptors, Auth Tokens, BaseURL)"]
    end

    subgraph SecurityBoundary ["Transport & Edge Security Boundary"]
        HTTPS["TLS / HTTPS Encryption"]
        CORSGateway["CORS Policy Enforcement"]
        RateLimit["Rate Limiter (Express-Rate-Limit / Redis-ready)"]
        HelmetMW["Helmet Security Headers & CSP"]
    end

    subgraph BackendCore ["Express.js + TypeScript Modular Application Server"]
        direction TB
        AuthMW["Authentication Middleware (JWT Access Token Verification)"]
        RBACMW["Role-Based Authorization Middleware (Customer / Staff / Admin)"]
        ValidationMW["Input Validation Middleware (Zod Schemas)"]
        PinoLogger["Pino Structured Logging & Request Tracing"]

        subgraph DomainServices ["Domain Business Logic Layer (Services)"]
            AuthService["Auth & Security Service"]
            CatalogService["Product & Category Service"]
            CartWishService["Cart & Wishlist Service"]
            OrderService["Order Processing & Fulfilment Service"]
            PaymentService["Payment Processing Service (Paystack)"]
            InventoryService["Inventory & Stock Ledger Service"]
            ReviewService["Reviews & Ratings Service"]
            MarketingService["Coupons & Discount Service"]
            SupportService["Customer Support & Ticket Service"]
            NotificationService["Notification & Dispatch Service"]
            AuditService["Audit Trail & Compliance Service"]
        end

        ErrorHandler["Centralized Asynchronous Error Handler (AppError)"]
    end

    subgraph DataPersistence ["Primary Data Persistence Layer"]
        MongoDB[(MongoDB Database Cluster)]
        MongooseODM["Mongoose ODM (Schemas, Hooks, Compound Indexes, Transactions)"]
    end

    subgraph ExternalIntegrations ["Third-Party External Services & Cloud Infrastructure"]
        PaystackAPI["Paystack Payment Gateway (Charges, Webhooks, Verification)"]
        CloudinaryCDN["Cloudinary Media Cloud (Optimized Product & Review Images)"]
        SMTPServer["Transactional Email Provider (Nodemailer / SMTP)"]
    end

    %% Client Layer to Frontend Framework
    CustomerExperience --> Router
    AdminExperience --> Router
    Router --> StateLayer
    StateLayer --> UILayer
    StateLayer --> APIClient

    %% Client to Security Boundary
    APIClient --> HTTPS
    HTTPS --> CORSGateway
    CORSGateway --> HelmetMW
    HelmetMW --> RateLimit

    %% Security Boundary to Backend
    RateLimit --> AuthMW
    AuthMW --> RBACMW
    RBACMW --> ValidationMW
    ValidationMW --> PinoLogger

    %% Backend internal flow
    PinoLogger --> DomainServices
    DomainServices --> ErrorHandler
    DomainServices --> MongooseODM
    MongooseODM --> MongoDB

    %% External Integrations
    PaymentService <-->|REST API & Webhooks| PaystackAPI
    CatalogService <-->|Direct Signed Uploads & CDN URLs| CloudinaryCDN
    NotificationService -->|SMTP / TLS| SMTPServer
```

---

## 3. Customer Shopping Journey Architecture Diagram

The sequence below details the transactional and communicative states throughout the customer lifecycle from initial discovery to delivery tracking.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Shopper / Customer
    participant SPA as React Frontend (SPA)
    participant API as Express API Gateway
    participant Auth as Auth & User Service
    participant Catalog as Catalog Service
    participant Cart as Cart Service
    participant Order as Order & Stock Service
    participant Paystack as Paystack Gateway
    participant Email as Notification Service
    participant DB as MongoDB Persistence

    Note over Customer, DB: Phase A: Onboarding & Authentication
    Customer->>SPA: 1. Register Account / Sign In
    SPA->>API: POST /api/v1/auth/login (Credentials)
    API->>Auth: Validate Credentials & Issue Tokens
    Auth->>DB: Query User & Verify bcrypt Hash
    Auth-->>SPA: Return User Profile + Set httpOnly Refresh Cookie + Access Token
    SPA-->>Customer: Authenticated Session Established

    Note over Customer, DB: Phase B: Product Discovery & Evaluation
    Customer->>SPA: 2. Browse Catalog, Filter & Search
    SPA->>API: GET /api/v1/products (Query, Category, Sort, Pagination)
    API->>Catalog: Retrieve Products with Compound Index Query
    Catalog->>DB: Query Active Products
    DB-->>Catalog: Product Document Set
    Catalog-->>SPA: Paginated Results & Facet Counts
    SPA-->>Customer: Render Responsive Product Grid

    Customer->>SPA: 3. View Product Detail & Image Gallery
    SPA->>API: GET /api/v1/products/:slug
    API->>Catalog: Fetch Product Details & Stock Status
    Catalog-->>SPA: Product, Variants & Verified Reviews
    SPA-->>Customer: Display High-Resolution Visuals (Cloudinary CDN)

    Note over Customer, DB: Phase C: Cart Staging & Persistence
    Customer->>SPA: 4. Add Selected Variant to Cart
    SPA->>API: POST /api/v1/cart/items (ProductID, VariantID, Qty)
    API->>Cart: Validate Stock Availability & Upsert Cart Item
    Cart->>DB: Persist Customer Cart Document
    Cart-->>SPA: Updated Cart Summary
    SPA-->>Customer: Slide-out Cart Drawer with Live Subtotal

    Note over Customer, DB: Phase D: Checkout & Financial Settlement
    Customer->>SPA: 5. Proceed to Checkout & Select Address
    SPA->>API: POST /api/v1/checkout/initialize
    API->>Order: Stage Draft Order & Soft-Reserve Inventory
    Order->>DB: Create Order Record (Status: PendingPayment)
    API->>Paystack: Initialize Transaction (Reference, Amount, Callback)
    Paystack-->>API: Paystack Access Code & Authorization URL
    API-->>SPA: Return Checkout Token & Paystack Config
    SPA-->>Customer: Mount Paystack Inline Modal

    Customer->>Paystack: 6. Authorize Payment (Card, Bank Transfer, USSD)
    Paystack-->>Customer: Payment Authorization Complete
    Paystack->>API: 7. Webhook: charge.success (HMAC-SHA512 Signed)
    API->>API: Verify Webhook Signature (Zero-Trust Frontend)
    API->>Order: Confirm Payment & Deduct Inventory Hard Stock
    Order->>DB: Update Order Status -> 'Processing', Payment -> 'Paid'
    Order->>Email: Trigger Order Confirmation Receipt
    Email-->>Customer: Order Receipt & Tracking URL Sent via Email

    Note over Customer, DB: Phase E: Post-Purchase Fulfilment & Tracking
    Customer->>SPA: 8. Navigate to Order History / Tracking Page
    SPA->>API: GET /api/v1/orders/:orderNumber/track
    API->>Order: Retrieve Real-Time Fulfilment Milestones
    Order->>DB: Query Order & Shipping Details
    DB-->>Order: Current Fulfilment Status (Processing -> Shipped -> Delivered)
    Order-->>SPA: Timeline of Tracking Events
    SPA-->>Customer: Display Interactive Progress Tracker
```

---

## 4. Frontend Architecture Specifications

The frontend application is constructed with **React 18/19**, **TypeScript**, and **Vite**, adhering to modern component composition patterns, strict typing, and high visual polish.

### 4.1 Component & Styling Engine Strategy

- **Material-UI (MUI v6):** Serves as the primary enterprise component foundation for accessible interactive components (Dialogs, Menus, Selects, Autocomplete, Data Tables, Snackbars, and Rating widgets).
- **Bootstrap 5 & React-Bootstrap:** Utilized for rapid responsive 12-column grid structures, containers, layout scaffolding, and utility-friendly flexbox primitives.
- **Vanilla CSS Design Tokens (`index.css`):** Defines CSS custom properties (variables) for consistent typography, curated modern color palettes (deep slates, vibrant accents, dark mode variations), glassmorphic backdrops, smooth transitions, and box-shadow elevations.
- **Tailwind CSS Exclusion:** Tailwind CSS is strictly excluded in adherence to project directives. All styling is encapsulated via CSS Modules, Styled Components/MUI sx system, and Vanilla CSS token classes.

### 4.2 State Management Architecture

The client-side state is systematically separated into two distinct paradigms:

1. **Server State (TanStack Query / React Query):**
   - Manages asynchronous remote data, caching, background invalidation, and optimistic UI updates.
   - Handles product catalog queries, customer profile data, order history, and review listings with automatic deduplication.
2. **Client/Application State (Zustand):**
   - Manages synchronous, transient UI states.
   - Dedicated lightweight stores:
     - `authStore`: User identity, token status, permissions, login modals.
     - `cartStore`: Local cart drawer open/close state, optimistic item counters.
     - `uiStore`: Theme preference (light/dark), mobile navigation drawer, active toasts.
     - `checkoutStore`: Step wizard progress, selected shipping address ID, coupon state.

### 4.3 Form Management & Validation

- **React Hook Form:** Uncontrolled component performance with minimal re-renders.
- **Zod Schema Resolvers:** Form inputs are validated against isomorphic Zod schemas shared directly with the backend, guaranteeing validation parity between client feedback and server rejection.

---

## 5. Backend Architecture Specifications

The backend server is engineered as a structured, scalable **Express.js + TypeScript** application built on clean architectural patterns.

### 5.1 Layered Architecture Pattern

Each domain feature follows a strict four-layer separation:

```
Routes Layer (HTTP Method + URL Pattern + Middlewares)
      │
      ▼
Controller Layer (HTTP Request Parsing + Zod Validation Trigger + Response Envelope)
      │
      ▼
Service Layer (Pure Business Logic + Transactions + Orchestration + Third-party APIs)
      │
      ▼
Persistence Layer (Mongoose Schemas + Custom Static Methods + DB Compound Indexes)
```

### 5.2 Middleware Pipeline Execution Order

1. **Correlation / Request ID Middleware:** Injects unique `X-Request-ID` into every incoming request for distributed tracing across logs.
2. **Security Headers (Helmet):** Configures strict Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), X-Frame-Options (`DENY`), and X-Content-Type-Options (`nosniff`).
3. **Cross-Origin Resource Sharing (CORS):** Restricts origins strictly to configured `FRONTEND_URL` with credentials support (`Access-Control-Allow-Credentials: true`).
4. **Rate Limiting:** Protects the platform against brute-force attacks and volumetric DDoS. Tiered limits apply to authentication, general API, and webhook routes.
5. **Raw Body Parser (Paystack Webhooks Only):** Preserves raw byte buffers for cryptographic HMAC-SHA512 webhook signature verification.
6. **JSON Body Parser & URL Encoding:** Safely parses incoming JSON with a 1MB payload ceiling.
7. **Pino HTTP Logging:** Emits structured JSON log lines containing HTTP method, path, response status, duration in milliseconds, and correlation ID.
8. **Authentication (JWT Guard):** Validates Bearer access tokens from the `Authorization` header, extracts user context, and attaches `req.user`.
9. **Role-Based Access Control (RBAC Guard):** Verifies that `req.user.role` meets required permissions (e.g., `Customer`, `Staff`, `Admin`).
10. **Validation Middleware:** Evaluates `req.body`, `req.query`, and `req.params` against domain-specific Zod schemas before reaching the controller.
11. **Global Error Handler:** Catches all synchronous and asynchronous errors, normalizes them into standard JSON error envelopes, logs stack traces securely, and masks sensitive internals in production (`NODE_ENV === 'production'`).

---

## 6. Data Integrity & Transactional Consistency

In e-commerce, race conditions on inventory stock and fraudulent payment reporting represent existential risks. Cartiva Mini enforces strict integrity protocols:

1. **MongoDB Two-Phase Locking / ACID Transactions:** Checkout order creation and stock decrements execute within an atomic MongoDB Session (`startSession()`, `withTransaction()`).
2. **Stock Reservation & Expiry:** Upon checkout initiation, inventory is placed in a "soft-reserved" state with a 15-minute Time-To-Live (TTL). If payment fails or times out, the reservation is released back to available stock.
3. **Idempotent Webhook Processing:** Every Paystack webhook delivery is logged with its unique `event_id` and reference. Duplicate delivery attempts are immediately acknowledged with `200 OK` without re-executing business logic.
4. **Zero-Trust Client Payment Reporting:** The frontend client can never mark an order as "Paid". Payment verification requires:
   - Direct backend HTTPS call to Paystack's `/transaction/verify/:reference` endpoint, OR
   - Cryptographically verified Paystack webhook (`X-Paystack-Signature` matching HMAC-SHA512 of raw body with `PAYSTACK_SECRET_KEY`).

---

## 7. Operational & Telemetry Strategy

- **Structured Logging (Pino):** Zero-overhead JSON logging with configurable log levels (`debug`, `info`, `warn`, `error`, `fatal`). In development, output is piped through `pino-pretty`.
- **Health & Readiness Probes:** Endpoints at `/health/liveness` and `/health/readiness` check process vitality and MongoDB connection status for container orchestrators.
- **Graceful Shutdown:** Intercepts `SIGINT` and `SIGTERM` signals, closes active HTTP listeners, allows ongoing database transactions to finish cleanly within a 10-second timeout, and gracefully closes MongoDB connections.
