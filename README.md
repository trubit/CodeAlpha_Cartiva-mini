# Cartiva Mini — Production-Ready Full-Stack E-Commerce Platform

[![Cartiva Mini CI](https://github.com/cartiva-mini/cartiva-mini/actions/workflows/ci.yml/badge.svg)](https://github.com/cartiva-mini/cartiva-mini)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Cartiva Mini is an enterprise-grade, full-stack e-commerce web platform engineered with modern web standards, resilient software architecture, robust security, and modular maintainability.

---

## 1. Approved Technology Stack

### Frontend Architecture

- **Framework & Runtime:** React 18 with TypeScript, bundled by Vite
- **UI & Component System:** Material-UI (MUI v6) + Bootstrap 5 + React-Bootstrap + Vanilla CSS Design Tokens
- **Routing:** React Router v6 with protected route guards
- **State Management:** Zustand (synchronous client/UI state) + TanStack Query v5 (asynchronous server state caching)
- **Forms & Validation:** React Hook Form + Zod resolvers
- **HTTP Client:** Centralized Axios instance with correlation interceptors

### Backend Architecture

- **Runtime:** Node.js (>= 18) with Express.js and TypeScript
- **Database ODM:** Mongoose (MongoDB ODM) with compound indexing & multi-document ACID transactions
- **Security & Hardening:** Helmet security headers, restricted CORS, express-rate-limit, bcrypt password hashing
- **Input Validation:** End-to-end Zod schemas validating bodies, queries, and params
- **Logging & Tracing:** Structured Pino JSON logger with `X-Request-ID` correlation tracing

### Planned Integrations (Phases 3–17)

- **Payment Processing:** Paystack (inline popups, server verification, HMAC-SHA512 webhooks)
- **Media Asset Storage:** Cloudinary CDN for responsive product & review imagery
- **Transactional Communication:** Nodemailer / SMTP for order confirmations and receipts

---

## 2. Project Prerequisites

- **Node.js:** `v18.0.0` or higher (verified on Node `v20.x`, `v22.x`, and `v24.x`)
- **Package Manager:** `npm` `v9.0.0` or higher
- **MongoDB:** (Required starting Phase 4 for persistent storage; service runs in decoupled mode in Phase 2)

---

## 3. Quick Start & Installation

Cartiva Mini is governed by a **single root repository**. All installations and orchestrations execute from the project root:

```bash
# 1. Clone repository
git clone https://github.com/your-org/cartiva-mini.git
cd cartiva-mini

# 2. Configure environment variables from template
cp .env.example .env

# 3. Install all dependencies centrally (Frontend, Backend & Shared)
npm install
```

---

## 4. Development & Build Commands

All development, testing, and compilation commands run directly from the root directory:

| Command                | Description                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`          | Concurrently boots backend (port 5000) and frontend (port 5180)                             |
| `npm run dev:backend`  | Starts Express backend in live-reload mode via `tsx watch`                                  |
| `npm run dev:frontend` | Starts Vite React client development server                                                 |
| `npm run build`        | Compiles backend TypeScript to `dist/backend` and builds frontend bundle to `dist/frontend` |
| `npm run typecheck`    | Executes strict TypeScript compiler checks without emitting files                           |
| `npm run lint`         | Runs ESLint across all TypeScript and React source files                                    |
| `npm run lint:fix`     | Automatically fixes autofixable ESLint linting issues                                       |
| `npm run format`       | Formats all source files using Prettier                                                     |
| `npm run format:check` | Verifies code formatting against Prettier rules                                             |
| `npm test`             | Runs automated test suites using Vitest                                                     |
| `npm start`            | Launches compiled backend distribution in production mode                                   |

---

## 5. Architectural Directory Layout

```text
cartiva-mini/
├── frontend/                          # Client-side React + TypeScript application
│   ├── index.html                     # HTML5 entry template
│   ├── vite.config.ts                 # Vite bundler config
│   └── src/
│       ├── app/                       # Root providers & QueryClient
│       ├── components/                # Reusable UI components (MUI / Bootstrap)
│       ├── features/                  # Domain feature modules
│       ├── hooks/                     # Custom hooks (useAuth, useCart)
│       ├── layouts/                   # Layout wrappers (RootLayout)
│       ├── pages/                     # Routed view components
│       ├── routes/                    # React Router definitions
│       ├── services/                  # Axios API client
│       ├── stores/                    # Zustand stores (authStore, uiStore)
│       ├── styles/                    # Design tokens & MUI theme
│       └── main.tsx                   # React client entry point
├── backend/                           # Server-side Express.js + TypeScript application
│   └── src/
│       ├── config/                    # Environment & Pino logger configs
│       ├── middleware/                # Helmet, CORS, RateLimit, Error handling
│       ├── routes/                    # Versioned API routes (/api/v1/*)
│       ├── utils/                     # AppError & helpers
│       ├── app.ts                     # Express application factory
│       └── server.ts                  # HTTP server & graceful shutdown hooks
├── shared/                            # Isomorphic contracts shared between frontend & backend
│   └── types/                         # API response envelopes, DTOs, enums
├── docs/                              # Architecture, Design & Governance Deliverables
├── tests/                             # Vitest integration and unit test suites
├── .github/workflows/                 # Continuous integration pipeline
├── .env.example                       # Documented environment blueprint
├── package.json                       # Central root package.json
└── tsconfig.json                      # Root solution-style tsconfig
```

---

## 6. Current Project Phase

**Active Milestone:** Phase 3 — Backend Foundation & Infrastructure (Completed)  
**Next Milestone:** Phase 4 — Database Architecture & Data Modeling (MongoDB / Mongoose)

### Phase 3 Documentation:

- [Backend Architecture Specification](docs/BACKEND_ARCHITECTURE.md)
- [API Design & Contract Standards](docs/API_STANDARDS.md)
- [Security Implementation](docs/SECURITY_IMPLEMENTATION.md)
- [Logging & Observability Architecture](docs/LOGGING_AND_MONITORING.md)
- [Backend Setup & Maintenance Guide](docs/BACKEND_SETUP.md)
- [Landing Page Storytelling Framework](docs/LANDING_PAGE_STORYTELLING_FRAMEWORK.md)

Refer to [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) for the complete 20-phase master development roadmap.
