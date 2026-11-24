# Cartiva Mini — Payment Webhook Security & Idempotency (Phase 13)

## 1. Webhook Endpoint: `POST /api/v1/webhooks/paystack`

Webhooks provide asynchronous notification from Paystack when transactions succeed, fail, or complete processing.

---

## 2. Cryptographic Signature Verification (HMAC SHA512)

Every webhook request sent by Paystack includes an `x-paystack-signature` header:
- **Algorithm**: `HMAC-SHA512`
- **Secret Key**: `PAYSTACK_SECRET_KEY` (or `PAYSTACK_WEBHOOK_SECRET`)
- **Payload**: Raw incoming request buffer before JSON deserialization.

### Raw Body Retention Implementation:
In `backend/src/app.ts`:
```ts
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody?: Buffer }).rawBody = buf;
    },
  })
);
```

### Constant-Time Timing-Safe Comparison:
In `PaystackProvider.verifyWebhookSignature`:
```ts
const hmac = crypto.createHmac('sha512', this.webhookSecret);
const computedHash = hmac.update(rawBody).digest('hex');

const signatureBuf = Buffer.from(signature.trim().toLowerCase(), 'utf8');
const computedBuf = Buffer.from(computedHash.toLowerCase(), 'utf8');

if (signatureBuf.length !== computedBuf.length) return false;
return crypto.timingSafeEqual(signatureBuf, computedBuf);
```
This protects against timing side-channel attacks.

---

## 3. Replay Protection & Deduplication (`WebhookEvent` Collection)

To prevent attackers or network retries from replaying successful payment notifications:
1. Every incoming webhook is recorded with an `eventId` in the `WebhookEvent` collection.
2. If `eventId` has already been recorded and marked `processed: true`, the handler returns HTTP 200 immediately (`{ status: 'acknowledged', duplicate: true }`).
3. Out-of-order deliveries and late webhooks are verified against the authoritative database status: if an order is already `CONFIRMED` and `PAID`, no redundant updates or duplicate inventory deductions occur.
4. HTTP 200 is delivered within Paystack's 8-second timeout requirement.
