# Cartiva Mini — Dependency Inventory & Architecture Rationale

**Document Version:** 1.0.0  
**Phase:** Phase 2: Project Initialization & Dependency Installation  
**Date:** November 2026  
**Author:** Software Infrastructure Specialist & Technical Lead

---

## 1. Overview & Dependency Governance

Cartiva Mini enforces strict dependency management:

1. **Centralized in Root `package.json`:** All dependencies are managed and locked centrally to prevent duplicate versions, nested lockfiles, or phantom dependencies.
2. **Zero Unapproved Frameworks:** Tailwind CSS and Redux are strictly excluded.
3. **TypeScript First:** All selected libraries include first-party TypeScript definitions or high-quality `@types/*` community packages.

---

## 2. Production Dependencies

| Package Name            | Scope         | Version    | Architectural Purpose & Rationale                                                                        |
| ----------------------- | ------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `react`                 | Frontend      | `^18.3.1`  | Declarative component library for building modern user interfaces.                                       |
| `react-dom`             | Frontend      | `^18.3.1`  | DOM renderer for React components.                                                                       |
| `react-router-dom`      | Frontend      | `^6.27.0`  | Client-side routing with nested layouts, loaders, and protected route guards.                            |
| `@mui/material`         | Frontend      | `^6.1.5`   | Production-ready, accessible UI components (dialogs, menus, tables, buttons, inputs).                    |
| `@emotion/react`        | Frontend      | `^11.13.3` | CSS-in-JS style engine required by Material-UI.                                                          |
| `@emotion/styled`       | Frontend      | `^11.13.0` | Styled component primitive for Material-UI custom overrides.                                             |
| `@mui/icons-material`   | Frontend      | `^6.1.5`   | Standardized SVG iconography for Material-UI components.                                                 |
| `bootstrap`             | Frontend      | `^5.3.3`   | Responsive 12-column grid layout, container primitives, and flexbox utilities.                           |
| `react-bootstrap`       | Frontend      | `^2.10.5`  | React-native wrapper components for Bootstrap UI primitives.                                             |
| `zustand`               | Frontend      | `^5.0.0`   | Lightweight, unopinionated client-side state management (auth tokens, theme mode, drawer visibility).    |
| `@tanstack/react-query` | Frontend      | `^5.59.16` | Asynchronous server-state caching, background re-validation, deduplication, and optimistic mutations.    |
| `axios`                 | Frontend      | `^1.7.7`   | Promise-based HTTP client for browser API requests with request/response interceptors.                   |
| `react-hook-form`       | Frontend      | `^7.53.1`  | Performant, uncontrolled form validation with minimal re-renders.                                        |
| `@hookform/resolvers`   | Frontend      | `^3.9.0`   | Bridges React Hook Form with Zod schema validation.                                                      |
| `zod`                   | Shared / Both | `^3.23.8`  | TypeScript-first schema declaration and runtime validation library shared across client and server.      |
| `express`               | Backend       | `^4.21.1`  | Fast, minimalist HTTP server framework for Node.js RESTful API endpoints.                                |
| `mongoose`              | Backend       | `^8.7.3`   | MongoDB Object Data Modeling (ODM) library for schemas, indexes, and transactions (deferred to Phase 4). |
| `helmet`                | Backend       | `^8.0.0`   | Security middleware configuring essential HTTP response headers (CSP, HSTS, frameguard).                 |
| `cors`                  | Backend       | `^2.8.5`   | Cross-Origin Resource Sharing middleware enforcing strict frontend domain allowlists.                    |
| `express-rate-limit`    | Backend       | `^7.4.1`   | Basic rate-limiting middleware to protect APIs against volumetric denial-of-service and brute force.     |
| `pino`                  | Backend       | `^9.5.0`   | High-performance, low-overhead structured JSON logger for Node.js.                                       |
| `pino-http`             | Backend       | `^10.3.0`  | Express middleware automatically logging HTTP requests with duration and status.                         |
| `cookie-parser`         | Backend       | `^1.4.7`   | Parses cookie headers and populates `req.cookies` for secure `httpOnly` refresh token verification.      |
| `dotenv`                | Backend       | `^16.4.5`  | Loads environment variables from `.env` file into `process.env`.                                         |

---

## 3. Development & Tooling Dependencies

| Package Name                       | Scope           | Version   | Architectural Purpose & Rationale                                                                       |
| ---------------------------------- | --------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `typescript`                       | Root / Shared   | `^5.6.3`  | Static type checker and compiler enforcing strict type safety across the entire codebase.               |
| `tsx`                              | Backend / Dev   | `^4.19.1` | High-speed TypeScript execution engine powered by esbuild for hot-reloading development (`tsx watch`).  |
| `vite`                             | Frontend / Dev  | `^5.4.10` | Next-generation frontend build tool and lightning-fast HMR development server.                          |
| `@vitejs/plugin-react`             | Frontend / Dev  | `^4.3.3`  | Vite official plugin enabling Fast Refresh for React.                                                   |
| `concurrently`                     | Root / Dev      | `^9.0.1`  | Executes multiple commands concurrently (e.g. running backend and frontend with one command).           |
| `cross-env`                        | Root / Dev      | `^7.0.3`  | Sets environment variables cross-platform across Windows, macOS, and Linux without syntax friction.     |
| `vitest`                           | Root / Test     | `^2.1.3`  | Vite-native unit and integration test runner with high execution speed and built-in TypeScript support. |
| `@testing-library/react`           | Frontend / Test | `^16.0.1` | UI component testing utilities following DOM accessibility best practices.                              |
| `eslint`                           | Root / Dev      | `^8.57.1` | Static code analysis engine enforcing code quality, linting rules, and bug prevention.                  |
| `@typescript-eslint/parser`        | Root / Dev      | `^8.11.0` | Allows ESLint to parse TypeScript source files.                                                         |
| `@typescript-eslint/eslint-plugin` | Root / Dev      | `^8.11.0` | ESLint rules specific to TypeScript idioms.                                                             |
| `eslint-plugin-react`              | Frontend / Dev  | `^7.37.2` | React-specific linting rules.                                                                           |
| `eslint-plugin-react-hooks`        | Frontend / Dev  | `^5.0.0`  | Enforces the Rules of Hooks in React functional components.                                             |
| `prettier`                         | Root / Dev      | `^3.3.3`  | Opinionated code formatter ensuring uniform code style across all contributors.                         |
| `pino-pretty`                      | Backend / Dev   | `^11.3.0` | Pretty-prints Pino JSON logs in terminal for local development readability.                             |
| `@types/*`                         | Root / Dev      | Various   | TypeScript type definitions for Node, Express, React, CORS, Cookie-Parser.                              |
