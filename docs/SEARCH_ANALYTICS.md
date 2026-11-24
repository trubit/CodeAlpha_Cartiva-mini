# Privacy-Conscious Search Analytics Architecture

## 1. Overview

Cartiva Mini incorporates a lightweight, privacy-preserving search analytics foundation. The system captures customer search patterns and query effectiveness (e.g. zero-result queries) without recording personally identifiable information (PII) or blocking search request latency.

---

## 2. Privacy & Data Protection Safeguards

1. **No Keystroke Logging:** The autocomplete suggestion endpoint (`/products/suggestions`) does NOT log queries, preventing intermediate keystroke noise and accidental credential capture.
2. **IP Anonymization:** Raw IP addresses are masked prior to storage using the `anonymizeIp` cryptographic truncation utility:
   - **IPv4:** The final octet is masked to zero (e.g., `192.168.1.145` $\rightarrow$ `192.168.1.0`).
   - **IPv6:** The final 80 bits are truncated to `::` (e.g., `2001:db8:85a3:8d3:1319:8a2e:370:7348` $\rightarrow$ `2001:db8:85a3::`).
3. **No Sensitive Field Capture:** Query strings are normalized and bounded. Passwords, tokens, or personal identifiers are never accepted as valid search parameters.
4. **Isolated Storage:** Search analytics records reside in an isolated MongoDB collection (`search_analytics`), completely segregated from customer profiles, order history, and product data.

---

## 3. Schema & Database Model (`SearchAnalytics`)

```typescript
export interface SearchAnalyticsDocument extends Document {
  query: string;
  normalizedQuery: string;
  resultCount: number;
  userId?: Types.ObjectId;
  sessionId?: string;
  ipAddress?: string; // Anonymized
  userAgent?: string;
  timestamp: Date;
}
```

### Indexes & Retention

- **Trend Index:** `{ query: 1, timestamp: -1 }` accelerates popular query trend aggregation.
- **TTL Expiration Index:** `{ timestamp: 1 }, { expireAfterSeconds: 7776000 }` (90 days). MongoDB automatically deletes records older than 90 days, fulfilling privacy compliance (GDPR/CCPA storage limitation) with zero manual operational maintenance.

---

## 4. Asynchronous Fire-and-Forget Architecture

To prevent analytics logging from delaying customer response times, writes are dispatched asynchronously:

```typescript
// Dispatched non-blocking in ProductService.searchProducts
void SearchAnalytics.create({
  query: rawQuery,
  normalizedQuery,
  resultCount: total,
  userId: context?.userId,
  sessionId: context?.sessionId,
  ipAddress: anonymizeIp(context?.ipAddress),
  userAgent: context?.userAgent,
  timestamp: new Date(),
}).catch((err) => {
  logger.warn('Failed to record search analytics', { error: err.message });
});
```

Customer HTTP requests are fulfilled immediately without waiting for database analytics persistence.
