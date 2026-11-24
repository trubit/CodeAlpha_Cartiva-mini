# Centralized Notification Architecture — Cartiva Mini

## 1. Architectural Overview

Cartiva Mini implements a centralized, production-grade notification and customer communication architecture conforming to the modular monolith pattern. Rather than allowing individual domain modules (Auth, Checkout, Payment, Fulfilment, Support, Inventory) to execute direct, ad-hoc dispatches or embed provider secrets, all platform events channel through a unified Notification Service and persistent Outbox subsystem.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Cartiva Mini Business Domains                   │
│   (Auth, Checkout, Payment, Fulfilment, Support, Inventory)            │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Dispatch (notify / enqueue)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Centralized Notification Service                       │
│    (Notification Preferences Verification & Channel Fan-out)           │
└─────────────────┬──────────────────────────────────┬───────────────────┘
                  │                                  │
       In-App Dispatch                               Outbox Dispatch
                  │                                  │
                  ▼                                  ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│        Notification Model         │ │     NotificationOutbox Model      │
│  (Indexed User In-App Feed)       │ │  (Persistent MongoDB Queue)       │
└───────────────────────────────────┘ └──────────────────┬────────────────┘
                                                         │
                                                         ▼
                                      ┌───────────────────────────────────┐
                                      │       Outbox Worker Process       │
                                      │ (Atomic locking, Retries, Backoff)│
                                      └──────────────────┬────────────────┘
                                                         │
                                     ┌───────────────────┴───────────────────┐
                                     ▼                                       ▼
                     ┌───────────────────────────────┐       ┌───────────────────────────────┐
                     │     Email Provider Adapter    │       │   SMS / Push Adapters (Prep)  │
                     │  (Nodemailer / Branded HTML)  │       │   (Explicit boundary/offline) │
                     └───────────────┬───────────────┘       └───────────────────────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │   NotificationDelivery Model  │
                     │  (Immutable Audit & Tracking) │
                     └───────────────────────────────┘
```

## 2. Decoupling Business Transactions from Communication

A fundamental architectural principle implemented in Phase 17 is **zero transactional interference**:
- **Critical rule:** If a customer successfully pays or completes checkout, the business transaction must succeed immediately. An unavailable external email provider or network timeout must never rollback or fail an order or payment.
- Business domain services dispatch notifications asynchronously with fire-and-forget error isolation:
  ```ts
  void notificationService.notify({ ... }).catch(err => {
    logger.error('Failed to notify customer', { err });
  });
  ```
- The underlying email delivery job is persisted durably to the `NotificationOutbox` collection and processed by a dedicated worker with retry backoff and failure logging.

## 3. Core Modules & Directory Layout

The notification system resides under `backend/src/modules/notifications/`:

- `notification.service.ts`: Central entrypoint for all in-app operations (retrieval, unread badge count, mark as read, delete) and preference-aware multi-channel dispatch.
- `notification-outbox.service.ts`: Persistent queue manager, job scheduler with concurrency locks (`lockedAt`, `lockedBy`), exponential backoff retry calculator, and delivery auditor.
- `notification-preference.service.ts`: Consent verification and preference store enforcement. Guarantees mandatory transactional alerts can never be disabled.
- `notification.templates.ts`: Branded Cartiva Mini HTML/text template catalog with automated variable substitution and context-aware HTML escaping (`escapeHtml`).
- `providers/`: Provider-independent channel adapters:
  - `email.provider.ts`: Nodemailer/SMTP adapter with local dev simulation fallback.
  - `sms.provider.ts`: Provider-independent boundary cleanly marked as unavailable without invented endpoints.
  - `push.provider.ts`: Web Push VAPID boundary cleanly marked as unavailable.
- `notification.controller.ts`: Customer-facing REST endpoints.
- `admin-notification.controller.ts`: Administrative REST endpoints for outbox monitoring, manual job retries, and template inspection.
- `notification.routes.ts` & `admin-notification.routes.ts`: Secured Express route registries mounted under `/api/v1/notifications` and `/api/v1/admin/notifications`.

## 4. Concurrency & Concurrency Control

Outbox batch processing uses atomic MongoDB find-and-modify queries:
```ts
const job = await NotificationOutbox.findOneAndUpdate(
  {
    _id: pendingJob._id,
    $or: [{ lockedAt: null }, { lockedAt: { $lt: lockStaleThreshold } }],
  },
  {
    $set: {
      status: NotificationDeliveryStatus.PROCESSING,
      lockedAt: now,
      lockedBy: workerId,
    },
  },
  { new: true }
);
```
This guarantees safe multi-process execution without double dispatch, race conditions, or need for external Redis infrastructure.
