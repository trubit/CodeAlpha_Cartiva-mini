# Cartiva Mini — 20-Phase Master Development Roadmap

**Document Version:** 1.0.0  
**Phase:** Phase 1: Project Discovery, Architecture & Technical Planning  
**Date:** November 2026  
**Author:** Senior Full-Stack Software Architect & Technical Lead  
**Classification:** Strategic Engineering Roadmap Deliverable

---

## 1. Roadmap Overview & Phasing Methodology

The Cartiva Mini engineering lifecycle is structured across 20 distinct, sequential phases grouped into 5 strategic development stages. Each phase builds upon the verified deliverables of its predecessors, preventing architectural drift and guaranteeing production readiness at every milestone.

```
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: PROJECT FOUNDATION (Phases 1 - 4)                            │
│ Baseline discovery, monorepo setup, Express infra, MongoDB schemas     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ STAGE 2: CORE BACKEND & BUSINESS LOGIC (Phases 5 - 10)                 │
│ Auth, Users, Catalog, Inventory Ledger, Search Engine, Cart & Wishlist │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ STAGE 3: COMMERCE OPERATIONS (Phases 11 - 15)                          │
│ Shipping, Checkout Engine, Paystack Payments, Fulfilment, Admin Portal │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ STAGE 4: FRONTEND & INTEGRATION (Phases 16 - 18)                       │
│ Premium UI/UX Storefront, Transactional Emails, Full-Stack Convergence │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ STAGE 5: QUALITY & PRODUCTION (Phases 19 - 20)                         │
│ Automated Testing, Security Hardening, CI/CD, Containerized Deployment │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Feature-to-Phase Mapping Matrix

| Category     | Specific Feature Requirement          | Target Phase | Implementation Scope                                    |
| ------------ | ------------------------------------- | ------------ | ------------------------------------------------------- |
| **Customer** | Registration & Login                  | Phase 5      | JWT auth, bcrypt, email verification, password reset    |
| **Customer** | Customer Profiles & Addresses         | Phase 6, 11  | Profile updates, default addresses, address book        |
| **Customer** | Product Browsing, Details & Galleries | Phase 7, 16  | Catalog API, Cloudinary media galleries, responsive UI  |
| **Customer** | Product Search, Filtering & Sorting   | Phase 9      | Full-text search, facet counts, category filters        |
| **Customer** | Shopping Cart & Abandoned Recovery    | Phase 10     | Guest/User carts, TTL expiration, item calculations     |
| **Customer** | Wishlist & Saved Items                | Phase 10     | Customer bookmarks, stock status notifications          |
| **Customer** | Checkout & Order Placement            | Phase 12     | Draft orders, address validation, stock reservations    |
| **Customer** | Payment Processing (Paystack)         | Phase 13     | Inline modal, backend verification, webhooks            |
| **Customer** | Order History & Milestone Tracking    | Phase 14     | Timeline tracking, receipt downloads, order status      |
| **Customer** | Discount Coupons & Promos             | Phase 12     | Code redemption, usage limits, percentage/fixed cuts    |
| **Customer** | Product Reviews & Ratings             | Phase 16, 7  | Verified buyer reviews, 1-5 star ratings, helpful votes |
| **Customer** | Recently Viewed Products              | Phase 16     | Local client history store, quick re-access             |
| **Customer** | Returns & Refunds Request             | Phase 14, 15 | Return ticket creation, refund disbursement             |
| **Customer** | Customer Support & Ticketing          | Phase 15, 17 | Threaded messages, category assignment, priority        |
| **Customer** | Notifications & Alerts                | Phase 17     | Order status, stock alerts, promotional notifications   |
| **Admin**    | Admin Dashboard & KPI Cards           | Phase 15     | Revenue, order counts, customer velocity, low-stock     |
| **Admin**    | Product & Category Management         | Phase 7      | Full CRUD, variants, image upload, SEO metadata         |
| **Admin**    | Inventory Management & Ledger         | Phase 8      | Stock updates, reorder thresholds, audit trails         |
| **Admin**    | Customer Management & Role Control    | Phase 6, 15  | Customer list, suspension, staff role assignments       |
| **Admin**    | Order Management & Fulfilment         | Phase 14, 15 | Workflow transitions (Pack, Ship, Deliver, Cancel)      |
| **Admin**    | Payment Ledger & Refunds              | Phase 13, 15 | Gateway logs, Paystack refund triggers, ledger          |
| **Admin**    | Discount Campaign Management          | Phase 12, 15 | Coupon creation, usage counters, category scopes        |
| **Admin**    | Shipping Zone & Rate Configuration    | Phase 11, 15 | Flat/tiered rates, carrier configurations               |
| **Admin**    | Returns & Refunds Management          | Phase 14, 15 | Return approvals, inspection notes, restocking          |
| **Admin**    | Sales Reports & Analytics             | Phase 15     | Period aggregation, revenue charts, top products        |
| **Admin**    | Compliance Audit Logs                 | Phase 15     | Immutable record inspection, filter by actor/entity     |
| **Admin**    | Platform Settings & Store Config      | Phase 15     | Currency, store contact, maintenance mode               |
| **Platform** | Responsive Design & Mobile-First      | Phase 16     | MUI + Bootstrap grid, responsive drawers, touch targets |
| **Platform** | Progressive Web App Planning          | Phase 16     | Web manifest, offline shell caching strategy            |
| **Platform** | SEO & Meta Optimization               | Phase 16     | Dynamic OpenGraph, Twitter cards, meta descriptions     |
| **Platform** | Accessibility (WCAG 2.1 AA)           | Phase 16, 19 | ARIA roles, keyboard navigation, color contrast         |
| **Platform** | Performance & Asset Optimization      | Phase 18     | Code splitting, image lazy loading, TanStack caching    |
| **Platform** | Secure File Uploads                   | Phase 7, 16  | Cloudinary signed uploads, mime-type verification       |
| **Platform** | Error Monitoring & Logging            | Phase 3, 18  | Pino structured logs, error envelopes, correlation IDs  |
| **Platform** | Backup Strategy                       | Phase 4, 20  | MongoDB automated snapshots, point-in-time recovery     |
| **Platform** | Scalable Database Queries             | Phase 4, 9   | Compound indexing, lean queries, pagination cursors     |

---

## 3. Comprehensive 20-Phase Breakdown

---

### STAGE 1 — PROJECT FOUNDATION

#### Phase 1: Project Discovery, Architecture & Technical Planning

- **Objectives:** Conduct discovery on the workspace, design system architecture, formulate database schemas, API contracts, security blueprints, and 20-phase roadmap.
- **Features:** Comprehensive architectural documentation and operational blueprints.
- **Technical Responsibilities:** Workspace inspection, Git audit, Mermaid diagramming, schema definition, API contract drafting, threat modeling.
- **Dependencies:** None (Initiating Phase).
- **Deliverables:** `ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `API_DESIGN.md`, `SECURITY_PLAN.md`, `DEVELOPMENT_ROADMAP.md`, `PROJECT_STRUCTURE.md`, `DISCOVERY_REPORT.md`.
- **Acceptance Criteria:** All 7 documents authored in `docs/` with zero application code written, adhering to all technical standards.
- **Security Considerations:** Ensure zero plaintext secrets appear in documentation; define zero-trust boundary.
- **Potential Risks:** Misalignment between theoretical architecture and actual library constraints. _Mitigation:_ Strict adherence to approved tech stack.

#### Phase 2: Project Initialization & Dependency Installation

- **Objectives:** Establish the unified monorepo directory layout, initialize Git, configure root `package.json`, install approved frontend/backend dependencies, and set up unified build/dev scripts.
- **Features:** Root build tooling, npm workspaces, shared TypeScript configuration, ESLint/Prettier code standards.
- **Technical Responsibilities:** Directory scaffolding (`frontend/`, `backend/`, `shared/`), root `package.json` setup, tsconfig base setup, Vitest config.
- **Dependencies:** Phase 1.
- **Deliverables:** Scaffolded directories, root `package.json`, root `tsconfig.json`, `.gitignore`, `.env.example`, shared TypeScript types package.
- **Acceptance Criteria:** `npm install` executes cleanly with zero peer dependency conflicts; TypeScript compiles without errors.
- **Security Considerations:** Lockfile integrity via `package-lock.json`; audit installed packages with `npm audit`.
- **Potential Risks:** Monorepo package resolution issues. _Mitigation:_ Use standard npm workspaces and project references.

#### Phase 3: Backend Foundation & Infrastructure

- **Objectives:** Build the Express.js + TypeScript server infrastructure, core middleware pipeline, error handling, and logging.
- **Features:** Request ID tracing, Helmet headers, CORS policies, rate limiting, structured Pino logging, global error handling.
- **Technical Responsibilities:** Express server instantiation, graceful shutdown handlers, health probe endpoints (`/health/liveness`), generic AppError class hierarchy.
- **Dependencies:** Phase 2.
- **Deliverables:** `backend/src/server.ts`, middleware modules, error handling controllers, Pino logger config.
- **Acceptance Criteria:** Express server starts on configured `PORT`, responds to health checks, logs structured JSON, and returns standardized error envelopes.
- **Security Considerations:** Helmet CSP configuration, strict CORS allowlist, request size limits (1MB).
- **Potential Risks:** Unhandled exceptions crashing Node process. _Mitigation:_ Global unhandledRejection and uncaughtException handlers.

#### Phase 4: MongoDB Database Architecture

- **Objectives:** Connect backend to MongoDB via Mongoose, establish schema definitions for all 16 collections, configure compound indexes, and set up transaction helpers.
- **Features:** Mongoose connection pooling, schema validations, index synchronization, atomic transaction wrapper.
- **Technical Responsibilities:** Mongoose model definitions (`User`, `Product`, `Order`, etc.), compound index declarations, pre/post middleware hooks.
- **Dependencies:** Phase 3.
- **Deliverables:** 16 Mongoose models in `backend/src/models/`, database connection module in `backend/src/config/db.ts`, seed script foundation.
- **Acceptance Criteria:** Successful connection to MongoDB; index build succeeds without warnings; schema validations enforce business rules.
- **Security Considerations:** TLS connection strings, sanitizing MongoDB operator injections, credentials strictly in `.env`.
- **Potential Risks:** Performance bottlenecks on unindexed queries. _Mitigation:_ Verified compound index creation matching catalog and order access patterns.

---

### STAGE 2 — CORE BACKEND AND BUSINESS LOGIC

#### Phase 5: Authentication & Authorization

- **Objectives:** Implement user registration, login, dual-token JWT flow, email verification, password reset, and RBAC guards.
- **Features:** Customer/Staff/Admin login, bcrypt password hashing, access/refresh token rotation, email verification tokens, password recovery.
- **Technical Responsibilities:** Auth controllers, JWT signing/verifying utilities, `authenticate` and `authorize` middleware, Nodemailer email dispatchers.
- **Dependencies:** Phase 4.
- **Deliverables:** `/api/v1/auth/*` endpoints, auth middleware, cryptographic token utilities, email notification templates.
- **Acceptance Criteria:** Unit/integration tests pass for registration, login, token refresh, and RBAC route protection.
- **Security Considerations:** httpOnly secure cookies for refresh tokens; bcrypt salt rounds 12; exponential backoff on failed logins.
- **Potential Risks:** Token theft or XSS leakage. _Mitigation:_ Keep access tokens strictly in memory; enforce SameSite=Strict cookies.

#### Phase 6: User Account & Customer Management

- **Objectives:** Build customer profile management, password updates, account deactivation, and administrative customer management.
- **Features:** Profile editing, password change with old-password verification, admin customer listing, user suspension.
- **Technical Responsibilities:** User service, profile controllers, admin user controllers, Zod validation schemas.
- **Dependencies:** Phase 5.
- **Deliverables:** `/api/v1/users/*` and `/api/v1/admin/users/*` endpoints, Zod user validators.
- **Acceptance Criteria:** Customers can update profile data; admins can view and filter user accounts; password changes invalidate prior tokens.
- **Security Considerations:** Prevent role escalation (customers cannot modify their own `role` field).
- **Potential Risks:** IDOR vulnerabilities in profile endpoints. _Mitigation:_ Enforce `req.user._id` matching on all non-admin routes.

#### Phase 7: Product & Category Management

- **Objectives:** Implement category hierarchy and comprehensive product catalog CRUD with variants, Cloudinary image uploads, and SEO fields.
- **Features:** Category tree, product CRUD, SKU generation, variant management, Cloudinary asset signing, low stock thresholds.
- **Technical Responsibilities:** Product and Category controllers/services, Cloudinary SDK integration, multipart image upload middleware.
- **Dependencies:** Phase 6.
- **Deliverables:** `/api/v1/products` and `/api/v1/categories` management endpoints, Cloudinary utility service.
- **Acceptance Criteria:** Admins can create categories and complex products with variants and images; validation rejects duplicate SKUs and negative prices.
- **Security Considerations:** Restrict `costPrice` to admin roles; validate file mime-types before Cloudinary upload.
- **Potential Risks:** Broken image links or orphan media files. _Mitigation:_ Cloudinary asset lifecycle management and cleanup hooks.

#### Phase 8: Inventory & Stock Management

- **Objectives:** Build the real-time inventory ledger and stock movement auditing system.
- **Features:** Atomic stock increments/decrements, low-stock threshold alerting, manual stock adjustment with operator logging.
- **Technical Responsibilities:** Inventory service, `InventoryMovement` recording, atomic MongoDB updates (`$inc`), low stock query views.
- **Dependencies:** Phase 7.
- **Deliverables:** `/api/v1/admin/inventory/*` endpoints, stock movement audit triggers.
- **Acceptance Criteria:** Stock adjustments generate immutable `inventory_movements` records; negative stock states are programmatically impossible.
- **Security Considerations:** Admin-only access for manual adjustments; immutable movement history.
- **Potential Risks:** Race conditions during high-volume concurrent purchases. _Mitigation:_ Conditional updates (`stockQuantity >= requestedQuantity`).

#### Phase 9: Product Discovery & Search Engine

- **Objectives:** Implement high-speed catalog filtering, full-text search, sorting, and faceted pagination.
- **Features:** Text search across titles/descriptions/tags, faceted filtering (category, price range, brand, availability), multi-attribute sorting.
- **Technical Responsibilities:** MongoDB text search aggregation pipeline, query parser, facet calculation engine.
- **Dependencies:** Phase 8.
- **Deliverables:** `/api/v1/products` search and filter endpoints with query parameter validation.
- **Acceptance Criteria:** Fast search responses (<50ms for 10k items); accurate facet counts; pagination handles out-of-range pages gracefully.
- **Security Considerations:** Sanitize regex and query parameters to avoid ReDoS (Regular Expression Denial of Service).
- **Potential Risks:** Slow query performance on complex multi-facet filters. _Mitigation:_ Tuned compound indexes and projection pruning.

#### Phase 10: Shopping Cart & Wishlist

- **Objectives:** Build persistent customer shopping carts, guest session carts, and customer wishlist management.
- **Features:** Add/update/remove cart items, cart calculations (subtotal, taxes, shipping preview), coupon code application, wishlist toggle.
- **Technical Responsibilities:** Cart and Wishlist services, session ID resolver, automatic guest-to-customer cart merger upon login.
- **Dependencies:** Phase 9.
- **Deliverables:** `/api/v1/cart/*` and `/api/v1/wishlist/*` endpoints, cart merge utilities.
- **Acceptance Criteria:** Cart accurately updates totals when item quantities change; guest carts automatically merge into user cart upon login.
- **Security Considerations:** Stock availability re-verified on every cart update; user isolation enforced.
- **Potential Risks:** Abandoned cart database bloat. _Mitigation:_ MongoDB TTL index on guest carts (`expiresAt: 30 days`).

---

### STAGE 3 — COMMERCE OPERATIONS

#### Phase 11: Shipping, Delivery & Address Management

- **Objectives:** Build customer address book management and geographic shipping rate calculation engine.
- **Features:** Multiple delivery addresses, default address selection, shipping zone rules, flat/weight-tiered rate calculation.
- **Technical Responsibilities:** Address controllers, shipping rate calculation service, `shipping_configurations` CRUD.
- **Dependencies:** Phase 10.
- **Deliverables:** `/api/v1/addresses/*` and `/api/v1/shipping/*` endpoints.
- **Acceptance Criteria:** Customers can manage addresses; checkout correctly calculates shipping fee based on delivery destination state and weight.
- **Security Considerations:** Address ownership isolation; rate tampering prevention.
- **Potential Risks:** Uncovered delivery zones. _Mitigation:_ Fallback nationwide default shipping tier.

#### Phase 12: Checkout & Order Processing

- **Objectives:** Implement the checkout state machine, draft order staging, inventory reservation, and coupon validation.
- **Features:** Checkout initialization, promotional coupon redemption, temporary stock reservation (15-min TTL), order snapshot creation.
- **Technical Responsibilities:** Checkout service, coupon validation engine, multi-document ACID transaction orchestrator.
- **Dependencies:** Phase 11.
- **Deliverables:** `/api/v1/checkout/*` and `/api/v1/coupons/*` endpoints, order generation pipeline.
- **Acceptance Criteria:** Initiating checkout creates an immutable order snapshot, reserves inventory, and calculates discounts without race conditions.
- **Security Considerations:** Validate coupon usage limits atomically; prevent negative order total vulnerabilities.
- **Potential Risks:** Abandoned checkouts permanently locking inventory. _Mitigation:_ Automated background task releases expired reservations after 15 minutes.

#### Phase 13: Payment Gateway & Financial Processing

- **Objectives:** Integrate Paystack payment gateway, handle inline transaction initialization, cryptographic webhook verification, and payment reconciliation.
- **Features:** Paystack transaction initialization, server-side transaction verification, HMAC-SHA512 webhook handler, ledger logging.
- **Technical Responsibilities:** Paystack API client, raw body webhook parser, `Payment` and `Transaction` records management.
- **Dependencies:** Phase 12.
- **Deliverables:** `/api/v1/payments/*` endpoints, Paystack webhook listener, payment verification service.
- **Acceptance Criteria:** Verified payment updates order status to `processing`; forged webhooks are rejected with 401; duplicate webhook events are handled idempotently.
- **Security Considerations:** Strict server-to-server verification; zero card details stored; webhook signature verification.
- **Potential Risks:** Network drops between Paystack and server. _Mitigation:_ Dual verification: client-triggered verify endpoint + asynchronous webhook.

#### Phase 14: Order Fulfilment & Tracking

- **Objectives:** Build order processing lifecycle, tracking milestones, customer order history, and return/refund processing.
- **Features:** Order status transitions (`processing` -> `packed` -> `shipped` -> `delivered`), tracking timeline, customer receipt view, return request flow.
- **Technical Responsibilities:** Order management service, timeline event generator, tracking number association.
- **Dependencies:** Phase 13.
- **Deliverables:** `/api/v1/orders/*` and `/api/v1/admin/orders/*` endpoints, public tracking route.
- **Acceptance Criteria:** Admins can transition order states and attach tracking details; customers can view status timelines and request returns.
- **Security Considerations:** Public tracking route requires order number + customer email/phone verification to prevent order scraping.
- **Potential Risks:** Inconsistent order state transitions. _Mitigation:_ Strict finite-state machine (FSM) enforcing allowed status transitions.

#### Phase 15: Admin Dashboard & Management System

- **Objectives:** Construct administrative reporting endpoints, analytics aggregation, ticket management, and audit log inspection.
- **Features:** KPI statistics (revenue, active orders, customer count), time-series sales reports, support ticket queue, compliance audit viewer.
- **Technical Responsibilities:** MongoDB aggregation pipelines for business intelligence, support ticket controllers, audit log query endpoints.
- **Dependencies:** Phase 14.
- **Deliverables:** `/api/v1/admin/dashboard/*`, `/api/v1/admin/reports/*`, and `/api/v1/support/*` endpoints.
- **Acceptance Criteria:** Dashboard queries aggregate revenue and sales trends accurately; support tickets route between customers and staff.
- **Security Considerations:** Strict Admin-only role guard on financial and audit log endpoints.
- **Potential Risks:** Heavy aggregation queries degrading database performance. _Mitigation:_ Lean projections, compound indexes, and optional Redis caching layer.

---

### STAGE 4 — FRONTEND AND INTEGRATION

#### Phase 16: Premium Frontend & Customer Experience

- **Objectives:** Implement the customer storefront and administrative portal UI using React, TypeScript, Vite, MUI v6, React-Bootstrap, and Vanilla CSS tokens.
- **Features:** Responsive product catalog, rich galleries, quick view modals, slide-out cart drawer, multi-step checkout wizard, order tracking timeline, admin data grids, reviews widget.
- **Technical Responsibilities:** Component architecture, Zustand stores (`auth`, `cart`, `ui`), TanStack Query hooks, React Hook Form + Zod resolvers.
- **Dependencies:** Phase 15.
- **Deliverables:** Fully styled, responsive Single Page Application in `frontend/src/`.
- **Acceptance Criteria:** UI delivers a stunning, premium aesthetic; 100% responsive across mobile, tablet, and desktop; zero console errors.
- **Security Considerations:** Automatic XSS escaping via React JSX; access tokens stored purely in-memory; httpOnly cookie preservation.
- **Potential Risks:** Large bundle sizes. _Mitigation:_ Route-level code splitting via `React.lazy()` and Vite dynamic imports.

#### Phase 17: Notifications, Emails & Customer Communication

- **Objectives:** Implement automated transactional emails (welcome, order confirmation, shipping updates, password resets) and in-app customer notifications.
- **Features:** Responsive HTML email templates, Nodemailer SMTP transport, in-app notification center, read/unread status badges.
- **Technical Responsibilities:** Email templating engine, notification dispatch worker, `/api/v1/notifications/*` endpoints.
- **Dependencies:** Phase 16.
- **Deliverables:** Transactional email service, in-app notification component and backend handlers.
- **Acceptance Criteria:** Emails render cleanly across major email clients; notifications appear in real-time or upon route transitions.
- **Security Considerations:** Rate-limit notification creation; sanitize email template variables to prevent template injection.
- **Potential Risks:** SMTP server downtime blocking order completion. _Mitigation:_ Asynchronous email dispatch detached from main HTTP request lifecycle.

#### Phase 18: Full-Stack Integration & Optimization

- **Objectives:** Wire frontend and backend seamlessly, optimize caching, tune API payloads, and configure progressive web enhancements.
- **Features:** TanStack Query cache invalidations, optimistic cart updates, image lazy-loading via Cloudinary transformations, PWA manifest.
- **Technical Responsibilities:** End-to-end integration testing, bundle analysis (`rollup-plugin-visualizer`), asset compression, API payload minimization.
- **Dependencies:** Phase 17.
- **Deliverables:** Optimized full-stack application, unified launch scripts, PWA service worker foundation.
- **Acceptance Criteria:** Lighthouse performance score >90; full customer journey from search to payment executes flawlessly.
- **Security Considerations:** Verify that no development debug headers or sensitive fields leak to the browser.
- **Potential Risks:** Cache invalidation race conditions. _Mitigation:_ Structured TanStack Query query keys and explicit mutation invalidations.

---

### STAGE 5 — QUALITY AND PRODUCTION

#### Phase 19: Comprehensive Testing, Code Review & Security Hardening

- **Objectives:** Execute unit, integration, and end-to-end tests; run code and security reviews; patch vulnerabilities; enforce code quality gates.
- **Features:** Vitest unit test suites, Supertest API integration tests, accessibility audits (WCAG 2.1 AA), OWASP dependency audits.
- **Technical Responsibilities:** Test suite execution, linting validation (`npm run lint`), TypeScript strict verification (`npm run typecheck`), security scans.
- **Dependencies:** Phase 18.
- **Deliverables:** Test suites in `tests/`, test reports, security audit sign-off.
- **Acceptance Criteria:** 100% passing tests across critical commerce paths (auth, cart, checkout, payments, stock); zero high/critical vulnerabilities.
- **Security Considerations:** Automated secrets scanning; rate limit verification; penetration testing against IDOR and injection vectors.
- **Potential Risks:** Flaky integration tests. _Mitigation:_ In-memory MongoDB testing environment (`mongodb-memory-server`).

#### Phase 20: Production Deployment & Maintenance

- **Objectives:** Package application into multi-stage Docker containers, configure GitHub Actions CI/CD pipeline, and establish production backup/monitoring strategies.
- **Features:** Multi-stage Dockerfile, Docker Compose local staging, GitHub Actions CI workflow, production environment validation, MongoDB Atlas backup configuration.
- **Technical Responsibilities:** Containerization, CI/CD pipeline configuration, production health-check orchestration.
- **Dependencies:** Phase 19.
- **Deliverables:** `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, production operations runbook.
- **Acceptance Criteria:** Application builds, passes all CI tests, containerizes cleanly, and boots in a production environment with zero runtime errors.
- **Security Considerations:** Non-root Docker container user; minimal Alpine-based images; secrets injected via container runtime.
- **Potential Risks:** Production deployment downtime. _Mitigation:_ Zero-downtime rolling deployment and automated database backup verification.
