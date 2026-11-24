# Cartiva Mini — Admin Customer Support Management

## 1. Overview
The customer support desk provides an integrated, thread-based ticketing system where support and operations personnel can triage customer inquiries, reply to messages, assign tickets to staff, and track customer satisfaction.

## 2. Core Functional Modules
- **Ticket Categories:**
  - `ORDER_INQUIRY`: Delivery status, dispatch questions, item tracking.
  - `PRODUCT_QUESTION`: Sizing, specifications, restock queries.
  - `PAYMENT_ISSUE`: Payment confirmation, transaction queries.
  - `RETURN_REFUND`: Return requests, refund status.
  - `GENERAL`: General store feedback and customer support.
- **Priority Escalation:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- **Status Lifecycle:** `OPEN` -> `IN_PROGRESS` -> `WAITING_ON_CUSTOMER` -> `RESOLVED` -> `CLOSED`.
- **Conversation Threading:** Messages retain sender attribution (`customer` vs `staff`), timestamps, and optional attachments.
- **Privacy & IDOR Defense:** Customers can only view tickets they created (`userId` match). Only authorized administrators and operations staff can access the central administrative support queue.

## 3. Endpoints & Operations
- `GET /api/v1/admin/support/tickets`: Central ticket queue with status and priority filtering.
- `GET /api/v1/admin/support/tickets/:ticketId`: Complete ticket conversation history with customer context.
- `POST /api/v1/admin/support/tickets/:ticketId/messages`: Administrative response appended to ticket thread.
- `PATCH /api/v1/admin/support/tickets/:ticketId/status`: Update status, priority, or assigned staff handler.
