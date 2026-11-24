# Cartiva Mini — Admin Platform Settings & Configuration

## 1. Overview
The platform settings interface allows super-administrators to maintain store identity, customer service coordinates, inventory threshold defaults, order timeout rules, and public storefront policies.

## 2. Configuration Parameters
- **Store Identity:**
  - `storeName`: Brand display name (e.g., "Cartiva Mini").
  - `storeDescription`: Store tagline and SEO overview.
  - `contactEmail` & `contactPhone`: Customer contact channels.
  - `storeAddress`: Physical dispatch hub and operations headquarters.
- **Financial & Shipping Rules:**
  - `defaultCurrency`: Fixed to `NGN` (Nigerian Naira).
  - `freeShippingThresholdMinor`: Complimentary shipping qualification threshold (in kobo).
- **Operations & Stock Safeguards:**
  - `lowStockAlertThreshold`: System threshold triggering low stock notifications on the dashboard.
  - `orderAutoCancellationMinutes`: Window before unverified pending checkout reservations expire.
- **Customer Support & Store Policies:**
  - `supportEmail`: Operational ticketing and dispatch inquiry email.
  - `policies`: Configurable privacy policy, terms of service, and return/refund rules.

## 3. Strict Credential Isolation
Under no circumstances are environment secrets or provider keys exposed or editable via the platform settings interface:
- Paystack Secret Key (`PAYSTACK_SECRET_KEY`)
- JWT Access & Refresh Secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`)
- MongoDB Database URI (`MONGO_URI`)
- Cookie Signing Secret (`COOKIE_SECRET`)
All system secrets remain strictly server-side in secure environment variables.

## 4. Endpoints
- `GET /api/v1/settings`: Public storefront settings (store name, currency, policies).
- `GET /api/v1/admin/settings`: Full administrator configuration view.
- `PATCH /api/v1/admin/settings`: Atomic settings update with validation and audit logging.
