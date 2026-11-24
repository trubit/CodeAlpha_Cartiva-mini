# CARTIVA MINI — PHASE 18 KNOWN ISSUES & OPERATIONAL CONSIDERATIONS

**Project:** Cartiva Mini  
**Phase:** 18 of 20 (Full-Stack Integration & Optimization)  
**Status:** COMPLETE & DOCUMENTED  

---

## 1. Overview

While all 419 integration tests pass and zero critical bugs remain in the codebase, this document details operational nuances, external service behaviors, and production readiness requirements to ensure smooth production deployment.

---

## 2. Identified Operational Considerations

### 2.1 Paystack Test Card vs Live Transactions
* **Observed Behavior:** When testing the Paystack checkout popup using synthetic/dummy test card numbers in test mode without valid mock authorization triggers, Paystack responds with: `"We were unable to charge your card. Retry with test details."`
* **Root Cause:** In Paystack Test Mode, only Paystack's official test card numbers (e.g. `4084 0840 8408 4084` with PIN `0840` and OTP `123456`) are accepted by Paystack's sandbox simulator. Real debit cards or arbitrary numbers are deliberately declined by Paystack test servers.
* **Production Action:** When transitioning to production, populate `PAYSTACK_SECRET_KEY` and `VITE_PAYSTACK_PUBLIC_KEY` with live keys (`sk_live_...`, `pk_live_...`) in environment variables.

### 2.2 Paystack CSP Report-Only Console Notices
* **Observed Behavior:** During checkout modal initialization, browser developer tools may log non-blocking Content Security Policy notifications originating from Paystack's embedded analytics (`https://www.google-analytics.com/g/collect`).
* **Technical Reason:** The browser CSP directive in development is designated in `Content-Security-Policy-Report-Only` mode. It produces diagnostic log notices in devtools but does not block script execution, iframe loading, or card processing.

### 2.3 Single-Node MongoDB vs Multi-Document ACID Transactions
* **Current Configuration:** Development and testing run on a standalone local MongoDB instance (`mongodb://localhost:27017/cartiva-mini`).
* **Operational Consideration:** In standalone MongoDB instances, multi-document ACID transactions (`session.withTransaction(...)`) require a replica set (`rs0`). All atomic operations in Cartiva Mini (stock reservation, cart merging) currently leverage atomic `$inc` with query precondition filters (`{ availableQuantity: { $gte: qty } }`), ensuring atomic safety without requiring replica set quorum. For high-availability production clusters, a 3-node replica set is strongly recommended.

### 2.4 Frontend Vendor Chunk Warning (> 500 kB)
* **Observed Behavior:** Vite production build flags a warning: `(!) Some chunks are larger than 500 kB after minification (.../assets/ui-*.js 847 kB)`.
* **Technical Reason:** The Material UI v5 and Bootstrap 5 component trees, Emotion caching engine, and Material icons are consolidated into `ui-*.js` to minimize the number of round-trip HTTP requests.
* **Impact:** Non-blocking. The compressed gzipped transfer size is 252.9 kB, which loads within standard mobile performance budgets. Further modular icon tree-shaking can be scheduled during Phase 19/20 performance tuning.

### 2.5 Outbox Email Dispatch in Local Simulation Mode
* **Current Configuration:** When `SMTP_HOST` or production email credentials are not set, the email service initializes in `simulation/development mode`, logging dispatch events to console and saving simulated outbox records.
* **Production Action:** For live customer delivery, configure valid SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`) in the backend `.env`.

