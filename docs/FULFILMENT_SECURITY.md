# Cartiva Mini — Fulfilment Security & Access Control
**Phase 14: Order Fulfilment & Tracking**

---

## 1. Security Guardrails

### A. IDOR Protection on Tracking
- Customer endpoints (`/api/v1/orders/:orderId/tracking` and `/fulfilment`) enforce strict resource ownership.
- If `order.userId.toString() !== req.user.id`, the server immediately throws `403 FORBIDDEN` (`ORDER_ACCESS_DENIED`).
- Customers can never view another customer's shipping address, carrier waybill, or package contents.

### B. Administrative Role-Based Access Control (RBAC)
- All administrative fulfilment endpoints are guarded by `authenticate` and `requireRole(UserRole.ADMIN, UserRole.STAFF)`.
- Unauthorized requests return `403 FORBIDDEN`. Frontend navigation hiding is never relied upon as a security boundary.

### C. State Machine Guarding
- Transitions cannot jump or skip states arbitrarily.
- A delivered order cannot be casually set back to a prior status.
- Once marked `DELIVERED`, attempts to confirm delivery again return `400 BAD REQUEST` (`DELIVERY_ALREADY_CONFIRMED`).

### D. Audit Logging
- Every administrative state change, shipment creation, event append, delivery confirmation, and exception recording writes an immutable entry to `AuditLog`.
- Entries record `actorId`, `actorEmail`, `actorRole`, `action`, `resource`, `resourceId`, and a structured details payload.
