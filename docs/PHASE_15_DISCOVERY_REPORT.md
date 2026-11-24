# Cartiva Mini — Phase 15 Discovery & Architecture Assessment Report

**Phase:** Phase 15 of 20: Admin Dashboard & Management System  
**Date:** November 2026  
**Status:** Completed Prior to Implementation  
**Classification:** Architectural Inspection & Technical Design Report

---

## 1. Executive Summary

Phase 15 mandates the engineering of a centralized, secure, production-grade administrative management system ("Admin Control Centre") for Cartiva Mini. Rather than merely presenting high-level statistics, the system must empower authorized administrators and staff to manage, monitor, and audit the entire commerce ecosystem from a single interface.

A comprehensive inspection of the workspace across all prior phases (Phases 1–14) was conducted to evaluate existing database models, backend controllers, service layers, routes, frontend views, Zustand stores, and TanStack Query hooks.

---

## 2. Inventory of Existing Functionality & Reuse Strategy

| Management Domain | Existing Backend Artifacts (Phases 1–14) | Reuse & Extension Strategy |
| :--- | :--- | :--- |
| **Authentication & RBAC** | `User.model.ts`, `auth.middleware.ts` (`authenticate`, `requireRole`), `UserRole` (`customer`, `staff`, `admin`) | Reuse existing JWT & cookie verification; apply RBAC across all new and existing admin endpoints. Implement guard against self-demotion and last super-admin removal. |
| **Customer Management** | `User.model.ts`, `user.service.ts` (`adminListUsers`, `adminGetUserDetail`, `adminUpdateUserStatus`), `admin-user.routes.ts` | Reuse existing user listing, profile retrieval, and status update services. Extend with deletion request moderation and customer order history synthesis. |
| **Product & Categories** | `Product.model.ts`, `Category.model.ts`, `adminProductRouter`, `adminCategoryRouter`, `product.service.ts`, `category.service.ts` | Fully reuse existing admin product & category endpoints (creation, update, publishing, slugification, variant management). Integrate into centralized admin frontend. |
| **Inventory Management** | `InventoryMovement.model.ts`, `InventoryReservation.model.ts`, `adminInventoryRouter`, `inventory.service.ts` | Fully reuse existing stock adjustments, movements query, low-stock query, and threshold management. Integrate into centralized admin frontend. |
| **Order Processing** | `Order.model.ts`, `adminOrderRouter`, `order.service.ts` | Reuse order listing, status transitions, order audit logs, and detail snapshots. Enhance status transition validation. |
| **Payment & Refunds** | `Payment.model.ts`, `Refund.model.ts`, `Transaction.model.ts`, `adminPaymentRouter`, `payment.service.ts` | Reuse Paystack verification, transaction listing, reconciliation engine, and refund creation services. |
| **Shipping & Fulfilment** | `ShippingConfiguration.model.ts`, `Shipment.model.ts`, `adminShippingRouter`, `adminFulfilmentRouter`, `adminShipmentRouter`, `fulfilment.service.ts` | Reuse shipping zone configurations and Phase 14 complete fulfilment lifecycle (packing, dispatch, waybill assignment, tracking timeline, delivery confirmation, and exception handling). |
| **Coupons & Discounts** | `Coupon.model.ts` (Phase 4 schema defined with usage limits, date validations, discount types) | Implement `backend/src/modules/coupon` (validator, service, controller, admin routes, customer validation) and corresponding frontend management view. |
| **Reviews & Ratings** | `Review.model.ts` (Phase 4 schema defined with ratings, title, comment, verified buyer status) | Implement `backend/src/modules/review` (validator, service, controller, admin moderation routes) and corresponding frontend moderation table. |
| **Customer Support** | `SupportTicket.model.ts` (Phase 4 schema with messages array, priority, category, status) | Implement `backend/src/modules/support` (validator, service, controller, admin ticket routes) and corresponding frontend ticket queue and reply drawer. |
| **Sales & Reports** | MongoDB aggregation pipelines across `Order`, `Payment`, `Product`, and `User` | Implement `backend/src/modules/report` for financial aggregations (gross sales, net sales, refund totals, order metrics, product sales breakdown) and secure CSV exports with spreadsheet formula injection protection. |
| **Audit Logs** | `AuditLog.model.ts` (populated across Users, Products, Categories, Shipping, Orders, Payments, Fulfilment) | Implement `backend/src/modules/audit` (service, controller, admin routes) to provide read-only, paginated, filtered audit history inspection. |
| **Platform Settings** | Configured via environment variables; no dynamic business settings model | Implement `PlatformSettings.model.ts` and `backend/src/modules/settings` for store contact, currency, inventory thresholds, and policies without exposing server secrets. |

---

## 3. Security & Integrity Guarantees

1. **Strict Server-Side RBAC:** All administrative routes are protected by `authenticate` and `requireRole(UserRole.ADMIN)` or `requireRole(UserRole.ADMIN, UserRole.STAFF)`. Client-side route guards are purely UX conveniences; server authorization is non-negotiable.
2. **Super-Admin Protection:** At least one active Administrator must always exist. Demoting, suspending, or deleting the sole administrator account is blocked at the service level.
3. **No Direct Credential Tampering:** Administrators cannot inspect password hashes or directly overwrite customer passwords. Account recovery follows standard cryptographic reset workflows.
4. **Append-Only Audit Trail:** All administrative operations (status changes, stock adjustments, refunds, coupon creation, settings modifications, user suspensions) generate immutable `AuditLog` records with actor ID, IP address, user agent, and changes diff.
5. **Real Database Figures Only:** All dashboard metrics, sales figures, and inventory levels are computed directly via MongoDB aggregation. No mock data, hardcoded figures, or fabricated counters are permitted.
6. **CSV Formula Injection Defense:** All exported string fields beginning with `=`, `+`, `-`, or `@` are sanitized with a leading apostrophe (`'`) to neutralize executable formula injection in spreadsheet software.
7. **Zero Secret Leakage:** Platform settings never store or expose API keys, webhook secrets, database credentials, or email provider secrets.

---

## 4. Frontend Architecture Plan

- **Single Control Centre Hub:** Create a unified `AdminDashboardPage.tsx` and `AdminLayout` that hosts all 17 administrative functional areas within a responsive, cohesive sidebar navigation.
- **Tabbed & Sub-routed Navigation:** Seamless switching between Overview (Dashboard), Commerce (Orders, Products, Categories, Inventory, Coupons, Reviews), Operations (Fulfilment, Shipping, Support), Finance (Payments, Reports), Customers, and Administration (Team, Audit Logs, Settings).
- **Integration with Existing Pages:** Reuses and integrates the dedicated order and payment management interfaces while providing contextual actions across the control centre.
- **Consistent Visual Language:** Built using Cartiva Mini's established theme tokens, Material-UI components, responsive tables, loading skeletons, alert banners, and confirmation modals.

---

## 5. Execution Roadmap

1. **Shared Types & DTOs:** Update `shared/types/api.types.ts` with Phase 15 DTOs (Dashboard summary, reports, coupons, reviews, support tickets, audit logs, settings).
2. **Backend Services & Routes:**
   - Platform Settings (`PlatformSettings.model.ts`, `settings.service.ts`, `settings.controller.ts`, `settings.routes.ts`).
   - Coupon & Promotion Management (`coupon.validator.ts`, `coupon.service.ts`, `coupon.controller.ts`, `coupon.routes.ts`).
   - Review Moderation (`review.validator.ts`, `review.service.ts`, `review.controller.ts`, `review.routes.ts`).
   - Support Ticket Management (`support.validator.ts`, `support.service.ts`, `support.controller.ts`, `support.routes.ts`).
   - Reporting & Analytics (`report.service.ts`, `report.controller.ts`, `report.routes.ts`).
   - Audit Log Querying (`audit.service.ts`, `audit.controller.ts`, `audit.routes.ts`).
   - Dashboard Aggregations (`dashboard.service.ts`, `dashboard.controller.ts`, `dashboard.routes.ts`).
   - Admin Staff / Team Management extensions under `adminUserRouter`.
3. **Frontend API Services & Hooks:**
   - Create `admin.service.ts`, `coupon.service.ts`, `review.service.ts`, `support.service.ts`, `report.service.ts`, `audit.service.ts`, `settings.service.ts`.
   - Create TanStack Query hooks for all admin domains.
4. **Frontend UI Implementation:**
   - Build `AdminDashboardPage.tsx` as the centralized admin control centre with interactive dashboards, management tables, filter bars, creation dialogs, and moderation drawers.
   - Update header, router, and navigation links.
5. **Testing & Quality Verification:**
   - Automated test suite covering dashboard metrics, coupon validation, review moderation, support workflow, audit queries, settings updates, and authorization boundaries.
   - Typechecking, linting, and production build verification.
6. **Documentation:**
   - Create all 13 mandated documentation artifacts in `docs/`.
