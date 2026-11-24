# Notification Outbox Pattern & Resilient Retries — Cartiva Mini

## 1. Outbox Pattern Rationale

Direct synchronous dispatch of emails during web requests introduces severe reliability and latency risks:
1. Provider API outages or network packet loss would fail user checkout or payment verification.
2. SMTP handshakes take 500ms–2000ms, noticeably degrading checkout response times.
3. Node process crashes during dispatch result in silent message loss.

To resolve these issues, Cartiva Mini implements a **Persistent MongoDB Outbox Pattern** (`NotificationOutbox.model.ts`) that guarantees reliable, at-least-once message delivery without requiring Redis or third-party queue brokers.

## 2. Outbox Schema & Idempotency Controls

```ts
{
  eventId: string,              // Unique business identifier (e.g., pay_ord_1001_success)
  eventType: NotificationType,
  channel: NotificationChannel,
  recipientId?: ObjectId,
  recipientEmail?: string,
  recipientPhone?: string,
  title: string,
  content: {
    subject?: string,
    body: string,
    html?: string,
    actionUrl?: string,
    metadata?: Record<string, unknown>
  },
  priority: NotificationPriority,
  status: NotificationDeliveryStatus, // PENDING, PROCESSING, SENT, FAILED, RETRYING
  attempts: number,                   // Incremented on each dispatch attempt
  maxAttempts: number,                // Default: 5
  nextRetryAt?: Date,                 // Exponential backoff timestamp
  lockedAt?: Date,                    // Worker concurrency lock timestamp
  lockedBy?: string,                  // Unique worker instance ID
  errorMessage?: string,              // Last failure reason
  createdAt: Date,
  processedAt?: Date
}
```

### Unique Compound Index for Idempotency
`NotificationOutbox.schema.index({ eventId: 1, channel: 1 }, { unique: true });`
If a webhook re-triggers or duplicate payment confirmations occur, the duplicate insert fails silently via Mongo unique constraint violation, preventing repeated duplicate emails from ever being queued or sent.

## 3. Worker Concurrency & Atomic Locking

The outbox worker polls for eligible pending/retrying jobs:
```ts
const query = {
  status: { $in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.RETRYING] },
  $or: [
    { nextRetryAt: null },
    { nextRetryAt: { $lte: new Date() } }
  ],
  $and: [
    {
      $or: [
        { lockedAt: null },
        { lockedAt: { $lt: lockStaleThreshold } } // Automatically reclaims crashed worker jobs after 5 mins
      ]
    }
  ]
};
```
Claiming a job uses `findOneAndUpdate` with `$set: { status: 'PROCESSING', lockedAt: now, lockedBy: workerId }`.

## 4. Exponential Backoff Algorithm

When an eligible temporary failure occurs (e.g. SMTP connection timeout), the worker computes an exponential backoff delay before the next attempt:
$$\text{Delay} = \text{baseDelay} \times 2^{\text{attempts} - 1}$$
With a base delay of 2,000ms:
- Attempt 1: 2,000ms (2s)
- Attempt 2: 4,000ms (4s)
- Attempt 3: 8,000ms (8s)
- Attempt 4: 16,000ms (16s)
- Attempt 5: 32,000ms (32s)

If `attempts >= maxAttempts`, the job status transitions permanently to `FAILED`.

## 5. Administrative Manual Retry

Failed jobs can be inspected and manually retried by administrators via:
`POST /api/v1/admin/notifications/:outboxId/retry`
The service resets `status: PENDING`, `attempts: 0`, clear `nextRetryAt`, and `$unset: { errorMessage: 1 }`.
