# Provider Integrations & Channel Boundaries — Cartiva Mini

## 1. Overview

In compliance with Phase 17 directives, Cartiva Mini maintains a clear distinction between:
1. **Fully implemented, operational providers:** Nodemailer (SMTP / Mailtrap).
2. **Prepared provider boundaries (Offline/Unavailable):** SMS and Web Push channels.

No unapproved paid third-party dependencies have been integrated, and no channel is reported as operational without tested real credentials.

## 2. Email Provider Adapter (`email.provider.ts`)

- **Interface:** `NotificationEmailProvider`
  - `send(options: EmailDispatchOptions): Promise<ProviderDeliveryResult>`
- **Active Backend:** Nodemailer SMTP transport utilizing `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`.
- **Simulation Fallback:** If SMTP credentials are missing (local dev/test), dispatches log cleanly and emit simulated message IDs without network failure.

## 3. SMS Integration Boundary (`sms.provider.ts`)

- **Interface:** `NotificationSmsProvider`
  - `send(options: SmsDispatchOptions): Promise<ProviderDeliveryResult>`
- **Status:** **Unavailable (Channel Disabled)**
- **Design:** Provider-agnostic boundary structured for future Termii or Twilio integration.
- **Behavior:** Attempts to dispatch via SMS immediately log:
  `"SMS channel is not configured with an approved provider."`
  and return `{ success: false, error: 'SMS channel is currently unavailable...' }`.
  No invented endpoints or fake mock dispatches are used.

## 4. Push Notification Boundary (`push.provider.ts`)

- **Interface:** `NotificationPushProvider`
  - `send(options: PushDispatchOptions): Promise<ProviderDeliveryResult>`
- **Status:** **Unavailable (Pending VAPID Configuration)**
- **Design:** Prepared for standard Web Push protocol (`web-push` npm package with VAPID subscription keys).
- **Behavior:** Returns `{ success: false, error: 'Push notifications are not configured with active VAPID keys.' }`.
  The browser frontend does not prompt for permission indiscriminately on page load, respecting user privacy and battery life.
