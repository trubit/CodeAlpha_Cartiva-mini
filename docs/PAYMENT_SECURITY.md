# Cartiva Mini — Payment Security & Defensive Controls (Phase 13)

## 1. Security Architecture Matrix

| Security Threat | Defensive Control Implemented |
| :--- | :--- |
| **Forged Payment Success** | Backend queries Paystack directly via secret key; browser parameters are never trusted. |
| **Tampered Amounts** | Authoritative order amount is fetched from database; amounts returned from Paystack are compared in minor units. Discrepancies lock payment into `REQUIRES_REVIEW`. |
| **Fake Webhooks** | Webhook signature is validated using HMAC SHA512 with `crypto.timingSafeEqual` over the raw request body. |
| **Replayed Webhooks** | Unique `eventId` entries are stored in `WebhookEvent` and rejected if already processed. |
| **Duplicate Payments** | Existing active initialized sessions are reused; confirmed orders reject secondary initialization attempts. |
| **Excessive Refunds** | Available refundable balance is enforced; refunds exceeding settled amounts are blocked with 400 Bad Request. |
| **Unauthorized Transactions** | Strict Bearer JWT authentication and customer ownership checks; administrators require `UserRole.ADMIN`. |
| **Timing Attacks** | Constant-time buffer comparisons for webhook signature evaluation. |
| **Secret Leaks** | `PAYSTACK_SECRET_KEY` is loaded only in backend environment variables and stripped from logs and client bundles. |

---

## 2. Cryptographic Implementation Highlights

```ts
// Constant-time HMAC SHA512 verification in PaystackProvider
const hmac = crypto.createHmac('sha512', this.webhookSecret);
const computedHash = hmac.update(rawBody).digest('hex');

const signatureBuf = Buffer.from(signature.trim().toLowerCase(), 'utf8');
const computedBuf = Buffer.from(computedHash.toLowerCase(), 'utf8');

if (signatureBuf.length !== computedBuf.length) return false;
return crypto.timingSafeEqual(signatureBuf, computedBuf);
```
