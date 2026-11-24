# CARTIVA MINI — PHASE 18 DEPENDENCY & CONFIGURATION REVIEW

**Project:** Cartiva Mini  
**Phase:** 18 of 20 (Full-Stack Integration & Optimization)  
**Status:** COMPLETE & VERIFIED  

---

## 1. Project Configuration & Monorepo Layout

Cartiva Mini is organized as a unified, lean full-stack TypeScript workspace with a single root `package.json` and a single lockfile:

```
cartiva-min/
├── backend/                  # Node.js + Express + Mongoose REST API (Port 5000)
│   ├── src/
│   │   ├── config/           # Environment variables, database connection, logger
│   │   ├── core/             # Base classes, middleware (auth, RBAC, error handling)
│   │   ├── modules/          # Business domains (auth, product, cart, order, etc.)
│   │   └── server.ts         # Application entry point
│   └── tsconfig.json         # Backend TypeScript compiler configuration
├── frontend/                 # React 18 + Vite SPA (Port 5180)
│   ├── src/
│   │   ├── components/       # Common, layout, and shared UI components
│   │   ├── hooks/            # Custom React hooks (React Query / local state)
│   │   ├── layouts/          # Layout boundaries (Root, Auth, Dashboard, Admin)
│   │   ├── pages/            # View components (lazy loaded)
│   │   ├── routes/           # React Router v6 route configuration
│   │   ├── services/         # Axios API clients
│   │   └── stores/           # Zustand global state stores (auth, cart)
│   ├── index.html            # SPA entry point with responsive meta tags
│   ├── vite.config.ts        # Vite build tool and dev proxy config
│   └── tsconfig.json         # Frontend TypeScript compiler configuration
├── shared/                   # Shared types, interfaces, and enums
├── tests/                    # Vitest integration test suites (56 suites, 419 tests)
├── uploads/                  # Secure filesystem storage for product images
├── package.json              # Monorepo scripts, shared dependencies
└── tsconfig.json             # Root TypeScript project references
```

---

## 2. Dependency Audit

### 2.1 Backend Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.19.2 | Core HTTP server framework |
| `mongoose` | ^8.3.1 | MongoDB Object Document Mapper (ODM) |
| `zod` | ^3.23.4 | Schema validation for all incoming DTOs |
| `jsonwebtoken` | ^9.0.2 | JWT signing and verification |
| `bcryptjs` / `argon2`| Latest | Cryptographic password hashing |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing control |
| `helmet` | ^7.1.0 | HTTP security headers |
| `pino` / `winston` | Latest | Structured JSON application logging |
| `multer` | ^1.4.5-lts.1 | Multipart file upload parsing |
| `nodemailer` | ^6.9.13 | Transactional email delivery |
| `dotenv` | ^16.4.5 | Environment variable management |

### 2.2 Frontend Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.3.1 | Core UI library |
| `react-dom` | ^18.3.1 | React DOM rendering engine |
| `react-router-dom` | ^6.23.0 | Client-side routing with v7 transition flags |
| `@mui/material` | ^5.15.15 | Core UI design system and data tables |
| `@mui/icons-material` | ^5.15.15 | Visual iconography |
| `@emotion/react` | ^11.11.4 | CSS-in-JS style engine |
| `react-bootstrap` | ^2.10.2 | Grid layout and modal components |
| `bootstrap` | ^5.3.3 | Responsive CSS framework |
| `axios` | ^1.6.8 | HTTP client with request/response interceptors |
| `zustand` | ^4.5.2 | Lightweight client state management (auth, cart) |
| `lucide-react` | ^0.372.0 | Modern lightweight icons |

### 2.3 Development & Testing Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | ^5.4.5 | Static type checking across frontend and backend |
| `vite` | ^5.4.21 | Frontend build engine and dev server |
| `vitest` | ^2.1.9 | High-performance automated test runner |
| `supertest` | ^7.0.0 | HTTP assertions for backend API testing |
| `tsx` | ^4.7.2 | TypeScript execution runtime for dev scripts |

---

## 3. Environment Variable Specification

### Backend Configuration (`backend/.env`)

```ini
# Server Infrastructure
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5180

# Database
MONGODB_URI=mongodb://localhost:27017/cartiva-mini

# Authentication & Cryptography
JWT_SECRET=super-secret-jwt-key-replace-in-production-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=super-secret-refresh-key-replace-in-prod
REFRESH_TOKEN_EXPIRES_IN=7d

# Paystack Payment Gateway
PAYSTACK_SECRET_KEY=sk_test_********************************
PAYSTACK_BASE_URL=https://api.paystack.co

# Transactional Email (Optional for dev simulation)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=example@gmail.com
SMTP_PASS=app-specific-password
FROM_EMAIL="Cartiva Mini <noreply@cartivamini.com>"

# Storage Paths
UPLOAD_DIR=uploads
```

### Frontend Configuration (`frontend/.env`)

```ini
VITE_API_URL=http://localhost:5000/api/v1
VITE_PAYSTACK_PUBLIC_KEY=pk_test_********************************
```

---

## 4. Verification Check

* **TypeScript Compilation:** `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
* **Frontend Vite Build:** `npm run build:frontend` builds without errors in under 2.5 minutes.
* **Backend Build:** `npm run build:backend` (`tsc -p backend/tsconfig.json`) builds clean JavaScript output to `dist/backend`.
* **Zero Dependency Conflicts:** Single lockfile prevents phantom version mismatches between frontend, backend, and shared libraries.

