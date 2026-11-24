# Cartiva Mini — Customer Support UI (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Support Center (`/support`)

The customer-facing Support Center (`frontend/src/pages/SupportPage.tsx`) provides:
- Quick topic cards: Order Tracking, Delivery & Shipping, Returns & Refunds, Payment Assistance.
- Interactive FAQ accordions answering common customer questions.
- Direct contact options (support ticketing, email, phone, and hours of operation).

---

## 2. Customer Ticket Management (`/account/support`)

Integrated customer ticketing interface:
- **Submit Ticket Modal:**
  - Subject line.
  - Category picker (`Order Inquiry`, `Product Question`, `Payment Issue`, `Return & Refund`, `General`).
  - Priority selector (`Low`, `Medium`, `High`, `Urgent`).
  - Optional Order Number link.
  - Initial inquiry message.
- **Ticket History Table:**
  - Ticket reference ID (e.g., `TCK-20261105-XXXX`).
  - Subject and category chips.
  - Current status (`Open`, `In Progress`, `Waiting on Customer`, `Resolved`, `Closed`).
  - Action link to view ticket dialogue.

---

## 3. Ticket Dialogue & Messaging (`/account/support/:id`)

The Ticket Detail page (`frontend/src/pages/account/AccountTicketDetailPage.tsx`):
- Full chronological message thread distinguishing customer replies from Cartiva Support Specialist responses.
- Real-time timestamp formatting.
- Clean reply input box with instant submission and live list update.
