# CARTIVA MINI — PHASE 19 DEPENDENCY & PACKAGE AUDIT

**Project:** Cartiva Mini  
**Phase:** 19 of 20 (Comprehensive Testing, Code Review & Security Hardening)  
**Status:** COMPLETE & DOCUMENTED  

---

## 1. Audit Methodology & Lockfile Analysis

The dependency audit analyzed all production, development, and transitive dependencies in `package.json` and `package-lock.json` using `npm audit --json` and direct package inspection.

### Package Counts
* **Total Direct Dependencies:** 29 production packages
* **Total Dev Dependencies:** 27 developer tooling packages
* **Total Transitive Dependencies:** 685 packages in lockfile
* **Single Lockfile Enforced:** Verified. No competing `yarn.lock` or `pnpm-lock.yaml` files exist.

---

## 2. Dependency Vulnerability Analysis (`npm audit`)

The audit report identified 15 advisory items across transitive dependencies:

| Package | Severity | Category | Advisory Context | Mitigation / Status |
|---|---|---|---|---|
| `vitest` / `@vitest/mocker` | Critical / Moderate | Dev Only | Path traversal and code injection if unauthenticated Vitest UI server is listening. | **DEV ONLY:** Vitest UI server is disabled in production. CLI test runner is strictly used during testing (`vitest run`). |
| `vite` / `esbuild` | Moderate | Dev Only | Dev-server alternate paths on Windows or dev-server cross-origin middleware. | **DEV ONLY:** Vite is compiled into static production assets (`vite build`) and is never run as an internet-facing dev server in production. |
| `zod` (<4.6.6) | High | Production | Potential memory consumption during deep schema validation of unbounded nested collections. | **CONTROLLED:** Express request body size limit is capped at 1 MB, and arrays are constrained by `.max()` length validators in DTOs. |
| `@typescript-eslint/*` | Moderate | Dev Only | Minimatch regex backtracking in development tooling. | **DEV ONLY:** Linting runs locally during CI/CD checks; never bundled into runtime artifacts. |

> [!NOTE]
> Per Strict Project Rule 15: *"Maintain one root package.json and one lockfile. Do not upgrade major dependency versions blindly. Check compatibility and official migration documentation before making changes."*
> None of the dev-tooling vulnerabilities affect production builds or public HTTP runtimes. Major upgrades (such as Zod 4 or Vitest 5) introduce breaking API changes across all schemas and are planned for future major maintenance cycles.

---

## 3. Production Dependency Inventory

### Core Backend Stack
* `express` (^4.21.1): Battle-tested, stable HTTP framework.
* `mongoose` (^8.7.3): MongoDB ODM with connection pooling and schema validation.
* `zod` (^3.23.8): Runtime schema validation for all endpoints.
* `jsonwebtoken` (^9.0.3): RFC 7519 JSON Web Token signing and verification.
* `bcryptjs` (^3.0.3): Salted password hashing.
* `helmet` (^8.0.0): Security header enforcement.
* `cors` (^2.8.5): Cross-Origin Resource Sharing control.
* `pino` (^9.5.0) & `pino-http` (^10.3.0): High-speed JSON structured logger.
* `nodemailer` (^10.3.1): SMTP client for transactional email.

### Core Frontend Stack
* `react` (^18.3.1) & `react-dom` (^18.3.1): Core UI library.
* `react-router-dom` (^6.27.0): Declarative routing with v7 future compatibility flags.
* `@mui/material` (^6.1.5) & `@emotion/react`: Component design system.
* `react-bootstrap` (^2.10.5) & `bootstrap` (^5.3.3): Layout grids.
* `axios` (^1.7.7): Promise-based HTTP client with interceptors.
* `zustand` (^5.0.0): Client-side global state management.

---

## 4. Maintenance Guidelines

1. **Lockfile Integrity:** Always execute `npm ci` rather than `npm install` during production deployments to guarantee identical package versions.
2. **Review Cycles:** Schedule quarterly dependency reviews using `npm outdated` to adopt minor and patch-level security updates.

