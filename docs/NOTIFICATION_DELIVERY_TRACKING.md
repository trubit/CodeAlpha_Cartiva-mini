# Notification Delivery Tracking & Status Auditing — Cartiva Mini

## 1. Status Definitions & Strict Semantics

Cartiva Mini avoids ambiguous or misleading delivery statuses:
- **`PENDING`**: Job recorded in outbox; queued for worker pickup.
- **`PROCESSING`**: Claimed by a worker instance; dispatch in flight.
- **`SENT`**: The provider accepted the message for delivery (provider message reference obtained). **Does NOT imply inbox receipt.**
- **`DELIVERED`**: An authenticated provider delivery webhook confirmed physical inbox receipt.
- **`FAILED`**: Dispatch permanently failed or exceeded maximum retry attempts.
- **`RETRYING`**: Dispatch failed temporarily; waiting for exponential backoff window.
- **`CANCELLED`**: Job terminated administratively prior to dispatch.

## 2. Immutable Delivery Audit Log (`NotificationDelivery.model.ts`)

Every dispatch attempt by the outbox worker writes an immutable record to the `notification_deliveries` collection:
- `outboxId`: ObjectId reference to `NotificationOutbox`.
- `eventId`: Business event identifier.
- `eventType`: Event category.
- `channel`: `EMAIL`, `IN_APP`, `SMS`, `PUSH`.
- `recipient`: Redacted/normalized email or phone.
- `provider`: E.g. `nodemailer-smtp`.
- `providerMessageId`: Provider-supplied message identifier.
- `status`: Result of this specific attempt (`SENT` or `FAILED`).
- `attemptNumber`: Sequence number (1, 2, 3...).
- `errorMessage`: Error string if attempt failed.
- `durationMs`: Total network round-trip time in milliseconds.
- `createdAt`: Attempt timestamp.

### Automated Retention TTL Index
```ts
NotificationDeliverySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 180 } // 180 days retention
);
```

## 3. Administrative Monitoring

Staff and administrators can query delivery history via:
- `GET /api/v1/admin/notifications?status=failed&channel=email`
- `GET /api/v1/admin/notifications/:outboxId`
- Frontend UI: `/admin/notifications`
