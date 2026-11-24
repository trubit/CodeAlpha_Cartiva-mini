# Notification Security, Privacy & Sensitive Data Redaction — Cartiva Mini

## 1. Sensitive Data Protection

Cartiva Mini enforces strict security policies across all customer communications:
1. **No Plaintext Secrets:** Passwords, password reset tokens, JWT refresh tokens, and credit card CVVs are NEVER logged, rendered in email bodies, or included in in-app notifications.
2. **Safe Recovery Email Copy:** Password reset emails instruct users to click a secure link (`/reset-password?token=...`) with a 1-hour expiry. The reset token is never displayed in plaintext in the email body or subject line.
3. **Subject Line Neutrality:** Private financial balances or sensitive support details are never placed into email subject lines. Subject lines remain professional and concise (e.g., *"Cartiva Mini: Password reset request"*, *"Order Confirmed — #ORD-1001"*).
4. **Credential Redaction in Logs:** All logging through Pino strips or redacts provider secrets, API keys, and sensitive tokens.

## 2. Insecure Direct Object Reference (IDOR) Protection

In-app notification queries strictly scope records by `req.user._id`:
- Notification lookups, mark-as-read, and delete actions enforce `{ _id: notificationId, recipientId: req.user._id }`.
- If an attacker attempts to modify or delete another user's notification by guessing an `ObjectId`, the system returns `404 Not Found` (avoiding disclosure of whether the resource exists).

## 3. Role-Based Access Control (RBAC)

All administrative notification endpoints (`/api/v1/admin/notifications/*`) require authentication (`requireAuth`) and staff/admin authorization (`requireRole(UserRole.ADMIN, UserRole.STAFF)`). Unauthorized access by ordinary customers returns `403 Forbidden`.

## 4. Template Injection & Cross-Site Scripting (XSS)

Dynamic template variables are HTML-escaped using `escapeHtml` before rendering. No user-supplied parameters are treated as executable code or raw HTML.
