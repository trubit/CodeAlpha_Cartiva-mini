# Customer Notification Preferences — Cartiva Mini

## 1. Overview & Regulatory Compliance

Cartiva Mini implements a customer consent and notification preferences engine conforming to GDPR, CCPA, and Nigerian Data Protection Regulation (NDPR) principles:
- **Mandatory Transactional Communications:** Essential account and order updates (order confirmations, delivery tracking, password resets, account security alerts) are strictly required for platform contract execution and security. Customers are informed that these cannot be disabled.
- **Optional Marketing Communications:** Promotional emails, product updates, and newsletters are strictly opt-in or can be freely toggled off at any time. By default, marketing toggles are initialized to `false` (opt-out default).
- **Consent Decoupling:** Marketing consent is never made a prerequisite for purchasing products or completing checkout.

## 2. Notification Preference Model (`NotificationPreference.model.ts`)

```ts
{
  userId: ObjectId (unique, required),
  // Mandatory Transactional (Hardcoded true enforcement)
  orderUpdates: true,
  securityAlerts: true,
  // Optional Marketing Communications
  promotionalEmails: boolean (default: false),
  productUpdates: boolean (default: false),
  newsletter: boolean (default: false),
  // Channel Toggles
  emailEnabled: boolean (default: true),
  inAppAlerts: boolean (default: true),
  smsAlerts: boolean (default: false),
  pushAlerts: boolean (default: false),
  // Audit Trail
  marketingConsentTimestamp?: Date,
  marketingConsentIp?: string
}
```

## 3. Enforcement Logic (`notification-preference.service.ts`)

Before any notification is dispatched to a customer, `notificationService.notify` executes `isNotificationPermitted`:
- For transactional types (`ORDER_*`, `PAYMENT_*`, `SECURITY_*`, `ACCOUNT_*`, `SUPPORT_*`): Permission is **always granted** regardless of marketing preferences.
- For promotional types (`PROMOTION`, marketing campaigns): Permission checks `prefs.promotionalEmails && prefs.emailEnabled`. If consent is absent, the dispatch is aborted cleanly without error.

## 4. API & Frontend Integration

### Customer REST Endpoints:
- `GET /api/v1/notifications/preferences`: Retrieves current user preferences. Automatically provisions default preferences if record does not yet exist.
- `PATCH /api/v1/notifications/preferences`: Updates preference toggles. If incoming payload contains `orderUpdates: false` or `securityAlerts: false`, the validator and service automatically override them back to `true`.

### Frontend Customer Portal:
- Route: `/account/notifications/preferences`
- Interface:
  - Non-editable warning cards detailing mandatory transactional communication.
  - Active toggle switches for promotional emails, newsletters, and product launches.
  - Channel preferences with explicit status indicators (Email active; SMS & Push marked as unavailable).
