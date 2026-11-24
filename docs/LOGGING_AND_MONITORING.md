# Cartiva Mini — Logging & Observability Architecture

**Document Version:** 1.0.0  
**Phase:** Phase 3: Backend Foundation & Infrastructure  
**Date:** November 2026  
**Classification:** Observability & SRE Standard  
**Author:** Backend Platform Architect

---

## 1. Observability Overview

Cartiva Mini uses **Pino** as its high-performance structured JSON logger. Pino was selected for its ultra-low CPU overhead (asynchronous output stream buffering) and native compatibility with cloud log forwarders (Datadog, AWS CloudWatch, Logstash, Grafana Loki).

---

## 2. Environment Logging Profiles

### 2.1 Local Development Profile

- **Transport:** `pino-pretty`
- **Level:** `debug`
- **Features:** ANSI terminal colorization, human-readable ISO timestamps (`SYS:standard`), formatted metadata blocks.

### 2.2 Production Profile

- **Transport:** Native NDJSON (Newline Delimited JSON) to `process.stdout`.
- **Level:** `info` (or configurable via environment).
- **Features:** Zero pretty-printing overhead, structured JSON key-value pairs ready for automated parsing and alerting.

---

## 3. Correlation Tracing via `X-Request-ID`

Every incoming HTTP transaction is bound to a unique correlation identifier:

1. If the client or upstream proxy supplies `X-Request-ID`, it is validated and preserved.
2. If omitted, `crypto.randomUUID()` generates a RFC4122 v4 UUID.
3. The identifier is:
   - Attached to `req.headers['x-request-id']`.
   - Set on the HTTP response header `X-Request-ID`.
   - Embedded into every log entry for that request.
   - Attached to any error envelopes returned to the client.

#### Example Structured Log Entry:

```json
{
  "level": 30,
  "time": 1793643922000,
  "pid": 14208,
  "hostname": "cartiva-api-node-01",
  "requestId": "9c1b824a-7b3e-46f9-81a6-b51c09d8412e",
  "method": "GET",
  "url": "/api/v1/health",
  "statusCode": 200,
  "durationMs": "4.12ms",
  "ip": "::ffff:127.0.0.1",
  "userAgent": "Mozilla/5.0 ...",
  "msg": "HTTP GET /api/v1/health 200 - 4.12ms"
}
```

---

## 4. Privacy & Sensitive Data Redaction Rules

Under no circumstances may the following fields appear in log streams:

- Customer passwords or password hashes (`password`, `passwordConfirm`).
- Payment credentials, card PANs, CVVs, or Paystack secret keys.
- Full raw JWT strings (`token`, `refreshToken`, `accessToken`).
- Bearer authentication tokens in the `Authorization` header.

The centralized error middleware and request logger filter and redact headers to safeguard customer privacy and maintain PCI-DSS compliance.
