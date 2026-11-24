# Cartiva Mini — Admin Navigation and Permissions

## 1. Role-Based Access Control (RBAC) Matrix
The platform recognizes three primary user roles:
1. **`UserRole.CUSTOMER`**: Public consumer storefront, personal orders, addresses, and wishlist. Zero access to administrative endpoints or views.
2. **`UserRole.STAFF`**: Store operations staff handling order fulfilment, inventory adjustments, shipments, customer support, and review moderation.
3. **`UserRole.ADMIN`**: Full platform super-administrator with unrestricted oversight, staff provisioning, role adjustments, platform settings, and audit logs.

| Administrative Module | Route / Tab | Staff Access | Admin Access | Backend Authorization |
| :--- | :--- | :---: | :---: | :--- |
| **Overview & KPIs** | `/admin?tab=overview` | Read | Read | `requireRole([ADMIN, STAFF])` |
| **Orders** | `/admin?tab=orders` | Read / Update Status | Full Access | `requireRole([ADMIN, STAFF])` |
| **Products** | `/admin?tab=products` | Read | Create / Edit / Archive | `requireRole(ADMIN)` |
| **Categories** | `/admin?tab=categories` | Read | Create / Edit / Toggle | `requireRole(ADMIN)` |
| **Inventory** | `/admin?tab=inventory` | Read / Reconcile | Full Access | `requireRole([ADMIN, STAFF])` |
| **Coupons & Discounts** | `/admin?tab=coupons` | Read | Create / Toggle / Delete | `requireRole(ADMIN)` |
| **Reviews & Ratings** | `/admin?tab=reviews` | Moderate | Moderate / Delete | `requireRole([ADMIN, STAFF])` |
| **Fulfilment** | `/admin?tab=fulfilment` | Process / Pack / Ship | Full Access | `requireRole([ADMIN, STAFF])` |
| **Shipping Settings** | `/admin?tab=shipping` | Read | Manage Zones / Rates | `requireRole(ADMIN)` |
| **Support Desk** | `/admin?tab=support` | Reply / Resolve | Assign / Full Access | `requireRole([ADMIN, STAFF])` |
| **Payments** | `/admin?tab=payments` | Read | View / Issue Refund | `requireRole(ADMIN)` |
| **Sales Reports** | `/admin?tab=reports` | Read | View / Export CSV | `requireRole(ADMIN)` |
| **Customers** | `/admin?tab=customers` | Read Summary | Suspend / Restore | `requireRole(ADMIN)` |
| **Staff & Team** | `/admin?tab=team` | No Access | Create / Update Roles | `requireRole(ADMIN)` |
| **Audit Logs** | `/admin?tab=audit` | No Access | Immutable Inspection | `requireRole(ADMIN)` |
| **Platform Settings** | `/admin?tab=settings` | No Access | Full Configuration | `requireRole(ADMIN)` |

## 2. Navigation Structure
The administration sidebar organizes tasks into 5 logical operation pillars:
- **Overview:** Executive KPIs, Revenue Analytics, Status Breakdown.
- **Commerce:** Orders, Products, Categories, Stock Inventory, Promotional Coupons, Product Reviews.
- **Operations:** Fulfilment Queue, Shipment Tracking, Carrier Rates, Customer Support Desk.
- **Finance:** Paystack Payments, Refund Ledgers, Financial Reports & CSV Export.
- **Administration:** Customer Directory, Staff & Permission Controls, System Audit Trail, Store Configuration.

## 3. Anti-Lockout Enforcement
To safeguard platform operational continuity, the backend strictly rejects:
1. An administrator attempting to demote or suspend their own user account.
2. An administrator attempting to demote or suspend the final active super-administrator (`count <= 1`).
