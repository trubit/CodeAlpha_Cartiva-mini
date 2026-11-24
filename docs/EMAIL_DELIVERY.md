# Transactional Email Delivery — Cartiva Mini

## 1. Overview

Cartiva Mini utilizes a resilient transactional email delivery architecture built on Nodemailer and integrated with the persistent MongoDB Outbox pattern.

## 2. Configuration & Provider Setup

The email subsystem reads its configuration from backend environment variables:

```bash
# SMTP Configuration
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_smtp_username
EMAIL_PASSWORD=your_smtp_password
EMAIL_FROM="Cartiva Mini <noreply@cartivamini.com>"
ADMIN_EMAIL=admin@cartivamini.com
```

### Development & Testing Simulation Fallback
In development and automated test environments where real SMTP credentials are intentionally omitted, the email provider automatically engages simulation mode:
- Transports log dispatch details with simulated message IDs (`sim_msg_<random>`).
- Returns `{ success: true, messageId: 'sim_msg_...' }`.
- Prevents connection timeouts or test failures while ensuring the outbox lifecycle, retries, and delivery tracking are 100% verified.

## 3. Delivery Lifecycle & Statuses

Email jobs transition through well-defined statuses:
1. **PENDING**: Job created in outbox; queued for worker pickup.
2. **PROCESSING**: Job claimed by worker with atomic lock (`lockedAt`, `lockedBy`).
3. **SENT**: SMTP provider accepted the message for transport (provider messageId recorded).
4. **DELIVERED**: Provider webhook confirmed final inbox delivery (where supported).
5. **RETRYING**: Temporary failure occurred (network timeout, SMTP 421/450 error); scheduled for retry with exponential backoff.
6. **FAILED**: Maximum retry attempts (default: 5) exceeded, or permanent recipient error encountered.
7. **CANCELLED**: Job administratively cancelled before dispatch.

## 4. Immutable Delivery Tracking (`NotificationDelivery.model.ts`)

Every dispatch attempt generates an immutable delivery attempt record:
```ts
{
  outboxId: ObjectId,
  eventId: string,
  eventType: NotificationType,
  channel: NotificationChannel.EMAIL,
  recipient: "customer@example.com",
  provider: "nodemailer-smtp",
  providerMessageId: "sim_msg_12345",
  status: NotificationDeliveryStatus.SENT,
  attemptNumber: 1,
  errorMessage?: string,
  durationMs: 45
}
```
Records are automatically retained for 180 days via a MongoDB TTL index on `createdAt`.
