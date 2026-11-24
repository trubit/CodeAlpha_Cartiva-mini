# Cartiva Mini — Environment Variables Specification

**Document Version:** 1.0.0  
**Phase:** Phase 2: Project Initialization & Dependency Installation  
**Date:** November 2026  
**Author:** Application Security Specialist & Software Architect

---

## 1. Security Principles for Environment Variables

1. **Strict Client/Server Separation:**
   - Variables prefixed with `VITE_` are bundled directly into the client-side JavaScript artifact and are accessible to anyone inspecting the browser bundle.
   - **Never prefix private secrets, API secrets, database passwords, or JWT secrets with `VITE_`.**
2. **Never Commit Secrets:**
   - The `.env` file is excluded from Git via `.gitignore`.
   - Only `.env.example` (containing variable names and safe placeholder descriptions) may be committed.
3. **Runtime Schema Validation:**
   - Backend environment variables are validated at server startup using Zod in `backend/src/config/env.ts`.
   - If required variables are missing or malformed, the server process exits immediately with a descriptive error message.

---

## 2. Environment Variables Matrix

| Variable Name                | Required        | Target Scope     | Classification              | Description & Default Value                                                                          |
| ---------------------------- | --------------- | ---------------- | --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                   | Yes             | Backend / Client | Public Config               | Runtime environment: `'development'`, `'production'`, `'test'`. (Default: `'development'`)           |
| `PORT`                       | Yes             | Backend          | Server Internal             | Port number for Express HTTP listener. (Default: `5000`)                                             |
| `FRONTEND_URL`               | Yes             | Backend          | Server Internal             | Origin URL of the frontend application for CORS allowlisting. (Default: `http://localhost:5180`)     |
| `BACKEND_URL`                | Yes             | Backend          | Server Internal             | Base URL of the backend API for callbacks and health checks. (Default: `http://localhost:5000`)      |
| `MONGODB_URI`                | Yes (Phase 4+)  | Backend          | **Highly Sensitive Secret** | MongoDB connection string including credentials. (Default: `mongodb://localhost:27017/cartiva-mini`) |
| `JWT_ACCESS_SECRET`          | Yes (Phase 5+)  | Backend          | **Highly Sensitive Secret** | Secret key for signing short-lived JWT access tokens (minimum 32 characters).                        |
| `JWT_REFRESH_SECRET`         | Yes (Phase 5+)  | Backend          | **Highly Sensitive Secret** | Secret key for signing long-lived JWT refresh tokens (minimum 32 characters).                        |
| `JWT_ACCESS_EXPIRY`          | No              | Backend          | Server Internal             | Lifespan of access token. (Default: `'15m'`)                                                         |
| `JWT_REFRESH_EXPIRY`         | No              | Backend          | Server Internal             | Lifespan of refresh token. (Default: `'7d'`)                                                         |
| `PAYSTACK_SECRET_KEY`        | Yes (Phase 13+) | Backend          | **Highly Sensitive Secret** | Paystack private key for charging transactions and processing refunds.                               |
| `PAYSTACK_PUBLIC_KEY`        | Yes (Phase 13+) | Backend / Client | Public Key                  | Paystack public key for mounting the inline checkout modal.                                          |
| `CLOUDINARY_CLOUD_NAME`      | Yes (Phase 7+)  | Backend / Client | Public Identifier           | Cloudinary cloud account name for media delivery.                                                    |
| `CLOUDINARY_API_KEY`         | Yes (Phase 7+)  | Backend          | Sensitive Key               | Cloudinary API key for authenticated management calls.                                               |
| `CLOUDINARY_API_SECRET`      | Yes (Phase 7+)  | Backend          | **Highly Sensitive Secret** | Cloudinary API secret for generating signed upload signatures.                                       |
| `EMAIL_HOST`                 | Yes (Phase 17+) | Backend          | Server Internal             | SMTP server host (e.g. `smtp.mailtrap.io`).                                                          |
| `EMAIL_PORT`                 | Yes (Phase 17+) | Backend          | Server Internal             | SMTP server port (e.g. `2525` or `587`).                                                             |
| `EMAIL_USER`                 | Yes (Phase 17+) | Backend          | Sensitive Credential        | SMTP username for sending transactional emails.                                                      |
| `EMAIL_PASSWORD`             | Yes (Phase 17+) | Backend          | **Highly Sensitive Secret** | SMTP password for sending transactional emails.                                                      |
| `EMAIL_FROM`                 | Yes (Phase 17+) | Backend          | Public Config               | Default sender address (e.g. `Cartiva Mini <noreply@cartivamini.com>`).                              |
| `VITE_API_BASE_URL`          | Yes             | Frontend         | Public Config               | Base URL for Axios HTTP requests from browser. (Default: `http://localhost:5000/api/v1`)             |
| `VITE_PAYSTACK_PUBLIC_KEY`   | Yes (Phase 13+) | Frontend         | Public Key                  | Ingests Paystack public key into browser bundle.                                                     |
| `VITE_CLOUDINARY_CLOUD_NAME` | Yes (Phase 7+)  | Frontend         | Public Identifier           | Ingests Cloudinary cloud name into browser bundle.                                                   |

---

## 3. Local Development Configuration Template

Refer to [.env.example](file:///c:/Users/USER/OneDrive/Desktop/cartiva-min/.env.example) in the root directory for the exact template to copy into your local `.env`.
