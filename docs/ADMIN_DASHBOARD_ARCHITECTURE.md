# Cartiva Mini — Admin Dashboard Architecture

## 1. Overview
The **Phase 15 Administrative Control Centre** provides a centralized, secure management interface for authorized store staff and administrators. Built with React, TypeScript, Vite, Material UI (MUI), and TanStack Query, it interfaces directly with verified backend services and MongoDB aggregation pipelines across all 17 commerce, operations, and compliance domains.

## 2. Core Architectural Principles
1. **Single Management Environment:** Unified administrative access with domain-segmented navigation tabs rather than fractured standalone pages.
2. **Zero Mock or Hardcoded Data:** Every statistic, chart series, and KPI card is dynamically aggregated on-demand from real MongoDB collections (`Order`, `Payment`, `Product`, `Inventory`, `Refund`, `User`, `Category`, and `SupportTicket`).
3. **Defense in Depth (RBAC):** Backend-enforced route guards using `authenticate` and `requireRole([UserRole.ADMIN, UserRole.STAFF])`. Frontend role visibility controls supplement but never replace server-side authorization.
4. **Strict Financial Accounting:** Revenue is strictly computed from confirmed and verified payments (`paymentStatus: 'paid'`). Pending, failed, or abandoned checkouts are never conflated with gross sales.
5. **Clean State Synchronization:** Server state managed using TanStack Query with query invalidation upon mutations (`useMutation.onSuccess`).

## 3. High-Level System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                 Admin Control Centre Frontend               │
│     (MUI v5 + React 18 + TanStack Query + Zustand)          │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (JWT Bearer Auth)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express.js Backend Router                   │
│   ├── /api/v1/admin/dashboard (Summary & Chart Aggregations)│
│   ├── /api/v1/admin/users     (Staff & Customer Accounts)   │
│   ├── /api/v1/admin/products  (Catalog & Status Controls)   │
│   ├── /api/v1/admin/inventory (Physical & Reserved Stock)   │
│   ├── /api/v1/admin/orders    (Order Lifecycle Management)  │
│   ├── /api/v1/admin/payments  (Paystack Ledger & Refunds)   │
│   ├── /api/v1/admin/coupons   (Discounts & Promotions)      │
│   ├── /api/v1/admin/reviews   (Customer Review Moderation)  │
│   ├── /api/v1/admin/support   (Customer Support Desk)       │
│   ├── /api/v1/admin/reports   (Sales & CSV Neutralization)  │
│   ├── /api/v1/admin/audit-logs(Immutable Security Ledger)   │
│   └── /api/v1/admin/settings  (Platform Configuration)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose Driver (Indexes & Atomic Pipelines)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       MongoDB Database                      │
└─────────────────────────────────────────────────────────────┘
```

## 4. Aggregation Pipelines & Real-Time Metrics
The `DashboardService` executes optimized MongoDB aggregation pipelines with date-boundary filtering (`$gte`, `$lte`):
- **Gross Revenue:** Aggregated over `Payment` records where `status = PaymentStatus.PAID`.
- **Net Revenue:** `Gross Revenue - Total Refunded Minor Units`.
- **Order Status Distribution:** Dynamic `$group` by `orderStatus` across `confirmed`, `processing`, `dispatched`, `delivered`, and `cancelled`.
- **Inventory Health:** Real-time `$match` for physical on-hand stock `<= lowStockThreshold` and `== 0`.
- **Staff Workload:** Aggregated open/pending customer support tickets and moderation queues.

## 5. Security & Isolation Boundaries
- **JWT Authentication:** Strict authorization tokens verified per administrative request.
- **Role Invariants:** Administrative mutations are restricted strictly to authorized staff/admin roles.
- **Anti-Lockout Protection:** The platform forbids demoting or suspending the final remaining super-administrator account or self-demotion.
