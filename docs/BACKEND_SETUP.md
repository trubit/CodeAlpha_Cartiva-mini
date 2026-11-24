# Cartiva Mini — Backend Setup & Maintenance Guide

**Document Version:** 1.0.0  
**Phase:** Phase 3: Backend Foundation & Infrastructure  
**Date:** November 2026  
**Classification:** Operational Guide  
**Author:** DevOps & Backend Engineer

---

## 1. Prerequisites

- **Node.js:** v18.0.0 or higher (`node -v`)
- **Package Manager:** npm v9.0.0 or higher (`npm -v`)
- **Active Port:** `5000` (Backend API), `5180` (Frontend Storefront)

---

## 2. Environment Configuration

All backend environment settings are loaded from the root `.env` file and validated at boot time via Zod (`backend/src/config/env.ts`):

```bash
# Core Environment
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5180
BACKEND_URL=http://localhost:5000

# Database Configuration (Phase 4)
MONGODB_URI=mongodb://localhost:27017/cartiva-mini

# Authentication Secrets (Phase 5)
JWT_ACCESS_SECRET=cartiva_mini_dev_jwt_access_secret_key_32chars_min
JWT_REFRESH_SECRET=cartiva_mini_dev_jwt_refresh_secret_key_32chars_min
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

---

## 3. Starting the Backend Server

### 3.1 Development Mode (Hot Reloading via TSX)

```bash
npm run dev:backend
```

The server will initialize on `http://localhost:5000` and watch for changes across `backend/src` and `shared/types`.

### 3.2 Concurrent Full-Stack Development

```bash
npm run dev
```

Starts both the backend (Port 5000) and frontend (Port 5180) simultaneously with colored terminal logging.

### 3.3 Production Build & Start

```bash
# 1. Compile TypeScript to JavaScript in dist/backend
npm run build:backend

# 2. Run the production artifact with Node.js
npm run start
```

---

## 4. Key Endpoints & Verification

- **Liveness Probe:** `http://localhost:5000/api/v1/health`
  - Confirms Express process is running, reporting memory usage and uptime.
- **Readiness Probe:** `http://localhost:5000/api/v1/health/ready`
  - Reports `503 Service Unavailable` until MongoDB database connection is initialized in Phase 4.
- **Interactive API Documentation (Swagger UI):** `http://localhost:5000/api/v1/docs`
  - Visual interactive browser documentation rendered directly from the OpenAPI 3.0 specification.
- **Raw OpenAPI Specification:** `http://localhost:5000/api/v1/docs/openapi.json`

---

## 5. Maintenance & Quality Commands

```bash
# Run TypeScript compilation check without emitting files
npm run typecheck:backend

# Run ESLint across backend files
npm run lint

# Format code with Prettier
npm run format

# Run automated backend test suite with Vitest
npm test
```
