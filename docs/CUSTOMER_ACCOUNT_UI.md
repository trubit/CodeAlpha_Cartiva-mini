# Cartiva Mini — Customer Account & Profile UI (Phase 16)

**Tagline:** Everything You Need, Just a Click Away.  
**Phase:** 16 of 20 — Premium Frontend & Customer Experience

---

## 1. Customer Account Portal Architecture (`/account/*`)

The customer account portal (`frontend/src/pages/account/`) provides a centralized, secure self-service portal backed by the Phase 6 customer account services (`/api/v1/users`).

### Layout Structure
- **Persistent Sidebar Navigation:**
  - `Overview` (`/account`)
  - `My Profile` (`/account/profile`)
  - `Delivery Addresses` (`/account/addresses`)
  - `Security & Sessions` (`/account/security`)
  - `Support Requests` (`/account/support`)
  - `My Orders` (Direct shortcut to `/orders`)
  - `My Wishlist` (Direct shortcut to `/wishlist`)

---

## 2. Implemented Sub-Pages

### 1. Account Overview (`/account`)
- Real-time metric cards: Total Orders Placed, Saved Addresses, Wishlist Items.
- Recent Orders preview table with order status chips, item counts, totals, and direct links to `/orders/:orderNumber`.
- Default delivery address snapshot with quick edit shortcut.

### 2. Profile Management (`/account/profile`)
- View and update first name, last name, phone number, and avatar image.
- Form feedback with in-app toast updates.

### 3. Delivery Addresses (`/account/addresses`)
- Card grid of saved shipping addresses.
- Detailed modal dialog for adding and editing addresses with Nigerian state selection, city, street, and phone.
- Action to designate an address as primary default.
- Safe deletion dialog preventing accidental address loss.

### 4. Security & Active Sessions (`/account/security`)
- Change password form validating current password against new strong password.
- Active login sessions list detailing device, browser, IP address, and last activity timestamp.
- Remote session revocation trigger allowing customers to log out of other devices.
