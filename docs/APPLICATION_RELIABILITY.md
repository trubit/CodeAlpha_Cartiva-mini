# Application Reliability & Fault Tolerance — Cartiva Mini

**Project:** Cartiva Mini  
**Phase:** 18 (Reliability & Resilience)  
**Status:** Implemented & Verified  

---

## 1. Fault Tolerance Architecture

Cartiva Mini incorporates multiple defense-in-depth patterns to ensure graceful degradation during external provider downtime, network drops, and database disconnects.

---

## 2. Resilience Mechanisms

### 2.1 Persistent Notification Outbox & Exponential Backoff
When third-party delivery providers (e.g., Brevo email API) experience rate limiting or network interruptions:
1. Notifications are stored persistently in MongoDB (`NotificationOutbox`).
2. The dispatcher uses exponential backoff:
   $$\text{nextRunAt} = \text{now} + (\text{backoffBase} \times 2^{\text{attempts}})$$
3. Failed jobs transition to `retrying` status without failing the calling user transaction.
4. If the maximum attempt threshold is reached (5 attempts), jobs transition to `failed` and are surfaced in `/admin/notifications` for manual retry.

### 2.2 Payment Webhook Verification & Replay Protection
1. All Paystack webhook payloads must pass cryptographic HMAC-SHA512 verification against `PAYSTACK_SECRET_KEY`.
2. Every incoming event ID is verified against the `WebhookEvent` database model.
3. Network duplicates or retried webhook calls from Paystack are detected and acknowledged without executing duplicate database mutations.

### 2.3 Non-Blocking Session Bootstrapping
1. The frontend session check (`AppSessionInitializer`) encapsulates a 1500ms `AbortController` safety timeout.
2. If backend connectivity is interrupted or slow, the UI gracefully renders public storefront content rather than hanging on a permanent loading screen.

### 2.4 Centralized Global Error Boundaries
1. React root is wrapped in `<ErrorBoundary>` to catch unhandled rendering exceptions, preventing entire application white-screen crashes.
2. Standardized fallback UI allows users to safely recover, reload, or navigate back to the home page.

