# Cartiva Mini — Admin Security Architecture & Controls

## 1. Overview
The security architecture of the Administrative Management System enforces defense-in-depth principles across authentication, authorization, data validation, rate limiting, and audit logging.

## 2. Security Controls & Safeguards
1. **Multi-Tier Authorization (RBAC):**
   - Express router-level middleware (`authenticate` and `requireRole`).
   - Every administrative API endpoint rejects requests lacking valid bearer tokens with `401 Unauthorized` or insufficient privileges with `403 Forbidden`.
2. **In-Memory JWT Management:**
   - The frontend stores the access token purely in memory using Zustand. No token is ever placed in `localStorage` or `sessionStorage`, mitigating XSS exfiltration risks.
   - Session restoration utilizes secure, httpOnly, sameSite cookies.
3. **Mass Assignment & IDOR Protection:**
   - All inbound payloads are strictly validated and filtered against Zod schemas. Extraneous fields are stripped before database insertion.
   - Resource access checks verify that staff accounts cannot alter super-administrator records.
4. **Super-Admin Lockout Prevention:**
   - `UserService` checks the active administrator count before executing role updates or status deactivations.
   - Demoting or deactivating the last active administrator or demoting oneself returns `400 Bad Request`.
5. **CSV Injection (Formula Injection) Defense:**
   - Any export field starting with `=, +, -, @, \t, \r` is prefixed with `'` to neutralize executable spreadsheet macros.
6. **Immutable Security Audit Log:**
   - All state-altering administrative actions record an immutable ledger entry with actor identity, action type, IP address, and change diff.

## 3. Financial Security Invariants
- Direct database modification of stock or payment status is prohibited.
- Stock adjustments require explicit justification reasons.
- Order totals, subtotal minor units, shipping fees, and discount reductions are recalculated server-side; frontend totals are never trusted.
