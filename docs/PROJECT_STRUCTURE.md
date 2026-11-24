# Cartiva Mini — Unified Monorepo Project Structure & Architecture

**Document Version:** 1.0.0  
**Phase:** Phase 1: Project Discovery, Architecture & Technical Planning  
**Date:** November 2026  
**Author:** Senior Full-Stack Software Architect & Technical Lead  
**Classification:** Repository Architecture Deliverable

---

## 1. Unified Repository Architecture Strategy

Cartiva Mini is architected as a **single, unified full-stack monorepo**. It maintains strict physical separation of frontend and backend source trees while centralizing dependency resolution, continuous integration, environment definitions, and shared type contracts at the project root.

### Core Architectural Directives

1. **Single Root Command Center:**
   - Single root `package.json` coordinating all workspace packages.
   - Single installation command: `npm install` installs all root, frontend, backend, and shared dependencies deterministically.
   - Single development command: `npm run dev` concurrently boots the Express backend and Vite frontend development server.
   - Single build command: `npm run build` compiles shared contracts, typechecks both environments, and builds client bundles and server distributions.
2. **Shared Type System (`shared/types`):** Prevents contract drift by sharing API response types, DTOs, and entity models directly between Express controllers and React components.
3. **Strict Environmental Boundary:** Sensitive backend credentials (database URIs, Paystack secret keys, JWT secrets, email SMTP passwords) never cross into the frontend client build. The client only ingests public variables prefixed with `VITE_`.

---

## 2. Monorepo Directory Tree

```
cartiva-min/
│
├── frontend/                          # Client-side React application
│   ├── public/                        # Static public assets (favicon, manifest, robots.txt)
│   ├── src/
│   │   ├── app/                       # Application bootstrap, providers, QueryClient config
│   │   ├── assets/                    # Static images, SVG icons, brand assets
│   │   ├── components/                # Reusable presentation UI components (buttons, modals, inputs)
│   │   │   ├── common/                # Buttons, loaders, badges, alerts
│   │   │   ├── layout/                # Header, footer, navigation bar, drawer
│   │   │   └── feedback/              # Snackbars, skeleton loaders, error states
│   │   ├── features/                  # Domain-specific feature modules
│   │   │   ├── auth/                  # Login, registration, password recovery components
│   │   │   ├── catalog/               # Product grid, product card, filter sidebar
│   │   │   ├── cart/                  # Slide-out drawer, cart item list, subtotal
│   │   │   ├── checkout/              # Address selector, order summary, Paystack modal
│   │   │   ├── orders/                # Order history list, tracking timeline
│   │   │   └── admin/                 # Admin data tables, product forms, KPI widgets
│   │   ├── hooks/                     # Custom React hooks (useAuth, useCart, useDebounce)
│   │   ├── layouts/                   # Page layouts (CustomerLayout, AdminLayout, AuthLayout)
│   │   ├── pages/                     # Routed view components
│   │   │   ├── Home.tsx
│   │   │   ├── Catalog.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── Cart.tsx
│   │   │   ├── Checkout.tsx
│   │   │   ├── OrderConfirmation.tsx
│   │   │   ├── OrderTracking.tsx
│   │   │   ├── Profile.tsx
│   │   │   └── admin/                 # Admin Dashboard, Products, Orders, Customers
│   │   ├── routes/                    # Route declarations, ProtectedRoute, AdminRoute guards
│   │   ├── services/                  # Axios API clients and TanStack Query mutations/queries
│   │   ├── stores/                    # Zustand stores (authStore, cartStore, uiStore)
│   │   ├── styles/                    # Design tokens, MUI theme config, CSS variables
│   │   ├── types/                     # Frontend-specific UI types
│   │   ├── utils/                     # Formatters (currency, date), client helpers
│   │   ├── App.tsx                    # Root routing shell
│   │   ├── index.css                  # Core CSS design tokens & reset
│   │   └── main.tsx                   # Vite React entry point
│   ├── index.html                     # HTML5 entry template with SEO meta
│   ├── vite.config.ts                 # Vite bundler configuration & proxy setup
│   └── tsconfig.json                  # Frontend TypeScript configuration
│
├── backend/                           # Server-side Express.js application
│   └── src/
│       ├── config/                    # Database connection, Cloudinary, Paystack, logger configs
│       ├── controllers/               # HTTP request handlers & response envelopes
│       │   ├── auth.controller.ts
│       │   ├── user.controller.ts
│       │   ├── product.controller.ts
│       │   ├── category.controller.ts
│       │   ├── cart.controller.ts
│       │   ├── order.controller.ts
│       │   ├── payment.controller.ts
│       │   ├── review.controller.ts
│       │   ├── coupon.controller.ts
│       │   ├── shipping.controller.ts
│       │   └── admin.controller.ts
│       ├── middleware/                # Express middleware pipeline
│       │   ├── auth.middleware.ts     # JWT Bearer token verification
│       │   ├── rbac.middleware.ts     # Role authorization guard
│       │   ├── validate.middleware.ts # Zod request validation
│       │   ├── error.middleware.ts    # Centralized AppError handler
│       │   ├── rateLimit.middleware.ts# Tiered rate limiting
│       │   └── logger.middleware.ts   # Pino request correlation & logging
│       ├── models/                    # Mongoose database models & schemas (16 collections)
│       ├── modules/                   # Optional domain-driven internal module boundaries
│       ├── routes/                    # Express router definitions (/api/v1/*)
│       ├── services/                  # Pure business logic, third-party APIs & DB transactions
│       │   ├── auth.service.ts
│       │   ├── product.service.ts
│       │   ├── order.service.ts
│       │   ├── payment.service.ts     # Paystack integration & webhook verification
│       │   ├── inventory.service.ts   # Atomic stock ledger
│       │   ├── email.service.ts       # Nodemailer SMTP dispatch
│       │   └── cloudinary.service.ts  # Media uploads
│       ├── utils/                     # AppError class, token generators, currency math
│       ├── validators/                # Zod request validation schemas
│       └── server.ts                  # Express application initialization & listener
│   └── tsconfig.json                  # Backend TypeScript configuration
│
├── shared/                            # Isomorphic contracts shared between frontend and backend
│   └── types/
│       ├── api.types.ts               # Standard API response & error envelopes
│       ├── auth.types.ts              # Login/Register DTOs, JWT payloads
│       ├── user.types.ts              # User profiles, addresses, roles
│       ├── product.types.ts           # Product, Variant, Category interfaces
│       ├── cart.types.ts              # Cart item, Subtotal calculation interfaces
│       ├── order.types.ts             # Order, OrderItem, Tracking interfaces
│       ├── payment.types.ts           # Paystack transaction, Webhook payload types
│       └── enums.ts                   # UserRole, OrderStatus, PaymentStatus constants
│
├── docs/                              # Architecture, Design & Governance Documentation
│   ├── ARCHITECTURE.md                # System topology, modular monolith, Mermaid diagrams
│   ├── DATABASE_DESIGN.md             # 16 MongoDB collection schemas, indexes, security
│   ├── API_DESIGN.md                  # RESTful API modules, endpoints, request/response specs
│   ├── SECURITY_PLAN.md               # Auth, RBAC, payment security, OWASP mitigations
│   ├── DEVELOPMENT_ROADMAP.md         # 20-phase roadmap, feature mappings, criteria
│   ├── PROJECT_STRUCTURE.md           # Monorepo structure, folder directory guide
│   └── DISCOVERY_REPORT.md            # Discovery findings, workspace audit, baseline
│
├── scripts/                           # Devops, maintenance, and database migration scripts
│   ├── seed.ts                        # Initial categories, admin user, test catalog seed
│   └── healthcheck.ts                 # Health verification script
│
├── tests/                             # Integration and end-to-end test suites
│   ├── api/                           # Supertest backend integration tests
│   └── unit/                          # Shared utility tests
│
├── .github/                           # CI/CD Workflows
│   └── workflows/
│       └── ci.yml                     # Automated linting, typechecking, and test execution
│
├── .env.example                       # Documented environment variables blueprint
├── .gitignore                         # Comprehensive Git ignore rules
├── package.json                       # Central root package.json orchestrating workspaces
├── tsconfig.base.json                 # Shared base TypeScript compiler options
├── tsconfig.json                      # Root solution-style tsconfig referencing sub-projects
└── README.md                          # Project documentation and developer quickstart
```

---

## 3. Directory Purposes & Engineering Conventions

### 3.1 `frontend/src/`

- **`app/`**: High-level initialization, encapsulating TanStack `QueryClientProvider`, MUI `ThemeProvider`, and global routing wrappers.
- **`components/`**: Atomic, stateless UI components. Categorized into `common` (Button, Input, Badge), `layout` (Navbar, Footer, Sidebar), and `feedback` (Toast, Modal, Loader).
- **`features/`**: Domain-grouped UI subsystems. For example, `features/cart` encapsulates the slide-out drawer, cart quantity selectors, and coupon input.
- **`hooks/`**: Custom reusable React hooks for encapsulation of logic (e.g., `useDebounce`, `useMediaQuery`, `useAuth`).
- **`layouts/`**: Structural scaffolding shells containing navigation, header, and footer tailored for different user experiences (`CustomerLayout`, `AdminLayout`, `AuthLayout`).
- **`pages/`**: View components tied directly to URL routes. Pages orchestrate feature components and consume React Router params.
- **`routes/`**: Route definitions using React Router v6. Houses route protection wrappers (`ProtectedRoute` for authenticated customers, `AdminRoute` for staff/admin).
- **`services/`**: API abstraction layer. Configures Axios with base URLs, request headers, and response interceptors. Implements TanStack Query hooks.
- **`stores/`**: Lightweight client-side state managed via Zustand. Used strictly for non-server state (e.g., cart drawer visibility, active modals, user session tokens).
- **`styles/`**: Centralized design system tokens, Material-UI theme customization (palette, typography, component overrides), and global CSS variables in `index.css`.

### 3.2 `backend/src/`

- **`config/`**: Configuration loaders for database connections, environment variables, Cloudinary credentials, Paystack client, and Pino logger.
- **`controllers/`**: Thin HTTP controllers responsible for extracting request parameters, invoking domain services, and returning standard response envelopes.
- **`middleware/`**: Cross-cutting Express middlewares: Bearer JWT validation, RBAC enforcement, Zod validation, rate limiting, and centralized error handling.
- **`models/`**: Mongoose schemas and model definitions for all 16 system collections with indexes and validation hooks.
- **`routes/`**: REST endpoint route declarations binding URL paths, middleware chains, and controller actions.
- **`services/`**: Pure business logic layer. Completely decoupled from Express HTTP objects (`req`, `res`). Handles database queries, multi-document transactions, and third-party API calls.
- **`utils/`**: Shared server helpers, custom `AppError` subclasses, and cryptographic helpers.
- **`validators/`**: Isomorphic Zod validation schemas validating request bodies, query strings, and URL parameters.
- **`server.ts`**: The application entry point. Configures Express middleware, registers API routes, connects to MongoDB, and binds the HTTP port.

### 3.3 `shared/types/`

- Centralizes shared TypeScript interfaces, DTOs, and enums.
- Referenced by both `frontend/tsconfig.json` and `backend/tsconfig.json` via path aliases (`@shared/*`), guaranteeing 100% type parity across the network boundary.

---

## 4. Root Script Orchestration Strategy

The root `package.json` coordinates all tasks across workspaces:

```json
{
  "name": "cartiva-mini",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["frontend", "backend", "shared"],
  "scripts": {
    "dev": "concurrently -n \"BACKEND,FRONTEND\" -c \"blue,green\" \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run dev --workspace=frontend",
    "build": "npm run build:shared && npm run build:backend && npm run build:frontend",
    "build:shared": "npm run build --workspace=shared",
    "build:backend": "npm run build --workspace=backend",
    "build:frontend": "npm run build --workspace=frontend",
    "test": "vitest run",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc -b --noEmit"
  }
}
```

---

## 5. Environment Variables Blueprint Matrix

Environment variables are partitioned to enforce zero leakage of sensitive credentials:

| Variable Name           | Required | Target Scope       | Description                                                            | Frontend Exposure Allowed?         |
| ----------------------- | -------- | ------------------ | ---------------------------------------------------------------------- | ---------------------------------- |
| `NODE_ENV`              | Yes      | Backend & Frontend | Execution environment (`development`, `production`, `test`)            | Yes (`import.meta.env.MODE`)       |
| `PORT`                  | Yes      | Backend            | Express HTTP server listener port (e.g., `5000`)                       | **NO (Server-Only)**               |
| `MONGODB_URI`           | Yes      | Backend            | MongoDB connection string with credentials                             | **NO (Server-Only)**               |
| `JWT_ACCESS_SECRET`     | Yes      | Backend            | Cryptographic secret for signing access tokens                         | **NO (Server-Only)**               |
| `JWT_REFRESH_SECRET`    | Yes      | Backend            | Cryptographic secret for signing refresh tokens                        | **NO (Server-Only)**               |
| `FRONTEND_URL`          | Yes      | Backend            | URL of the frontend for CORS allowlist (e.g., `http://localhost:5180`) | **NO (Server-Only)**               |
| `BACKEND_URL`           | Yes      | Backend            | Public URL of backend for webhooks & callbacks                         | **NO (Server-Only)**               |
| `PAYSTACK_SECRET_KEY`   | Yes      | Backend            | Paystack private key for charging & verification                       | **NO (Server-Only)**               |
| `PAYSTACK_PUBLIC_KEY`   | Yes      | Backend & Frontend | Paystack public key for initializing inline popup                      | Yes (`VITE_PAYSTACK_PUBLIC_KEY`)   |
| `CLOUDINARY_CLOUD_NAME` | Yes      | Backend & Frontend | Cloudinary cloud account name                                          | Yes (`VITE_CLOUDINARY_CLOUD_NAME`) |
| `CLOUDINARY_API_KEY`    | Yes      | Backend            | Cloudinary API key                                                     | **NO (Server-Only)**               |
| `CLOUDINARY_API_SECRET` | Yes      | Backend            | Cloudinary API secret                                                  | **NO (Server-Only)**               |
| `EMAIL_HOST`            | Yes      | Backend            | SMTP server host (e.g., `smtp.mailtrap.io`)                            | **NO (Server-Only)**               |
| `EMAIL_PORT`            | Yes      | Backend            | SMTP server port (e.g., `587`, `465`)                                  | **NO (Server-Only)**               |
| `EMAIL_USER`            | Yes      | Backend            | SMTP authentication username                                           | **NO (Server-Only)**               |
| `EMAIL_PASSWORD`        | Yes      | Backend            | SMTP authentication password                                           | **NO (Server-Only)**               |
| `EMAIL_FROM`            | Yes      | Backend            | Outgoing sender address (e.g., `support@cartivamini.com`)              | **NO (Server-Only)**               |
| `VITE_API_BASE_URL`     | Yes      | Frontend           | Base URL for Axios client (e.g., `http://localhost:5000/api/v1`)       | Yes                                |
