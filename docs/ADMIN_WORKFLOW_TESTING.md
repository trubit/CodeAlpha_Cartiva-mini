# Admin Workflow Testing — Cartiva Mini

**Project:** Cartiva Mini  
**Phase:** 18 (Administrative Operations & RBAC)  
**Status:** Tested & Verified  

---

## 1. Scope of Administrative Testing

The administrative portal (`/admin/*`) and its backing endpoints (`/api/v1/admin/*`) were tested across all operational domains:

1. **Dashboard Analytics & KPIs:** Real-time calculation of Gross Revenue, Active Orders, Low Stock Alerts, and Customer Counts from live MongoDB records.
2. **Order Management:** Transitioning orders through fulfillment stages (`processing` $\to$ `packed` $\to$ `ready_for_shipment`).
3. **Fulfilment & Shipments:** Shipment creation, carrier assignment, tracking number generation, and dispatch timeline updates.
4. **Payments & Reconciliation:** Inspection of Paystack transactions, settlement status, and refund execution.
5. **Inventory & Movements:** Manual stock adjustments, threshold configuration, and inspection of audit log movements.
6. **Notification Monitoring:** Inspection of the persistent Notification Outbox, failure logs, and manual retry triggers.
7. **Role-Based Access Control (RBAC):** Verification that regular customer tokens are rejected with `403 Forbidden` on all `/api/v1/admin/*` endpoints.

---

## 2. Test Execution Records

| Workflow Domain | Test Action | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| **RBAC Enforcement** | Customer token calls `GET /api/v1/admin/dashboard/stats` | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASSED** |
| **RBAC Enforcement** | Admin token calls `GET /api/v1/admin/dashboard/stats` | HTTP 200 with live KPI metrics | HTTP 200 with live KPI metrics | **PASSED** |
| **Order Management** | Admin updates order status to `processing` | Order status updated; outbox event enqueued | Status updated; outbox event logged | **PASSED** |
| **Fulfillment Dispatch** | Admin generates shipment with carrier & tracking | Shipment record created; tracking URL generated | Shipment created; status `dispatched` | **PASSED** |
| **Payment Monitoring** | Admin reviews transaction list & details | Live Paystack transaction details rendered | Real data returned without mock values | **PASSED** |
| **Notification Outbox** | Admin queries failed outbox jobs & triggers retry | Outbox job retried via exponential backoff queue | Job retried and status updated | **PASSED** |
| **Layout Separation** | Admin loads `/admin/dashboard` | Renders `AdminLayout` with sidebar & topbar; no public footer | Clean admin portal rendered | **PASSED** |

