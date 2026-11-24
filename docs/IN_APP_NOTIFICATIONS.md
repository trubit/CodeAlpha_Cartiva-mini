# In-App Notifications — Cartiva Mini

## 1. Overview

Cartiva Mini provides customers with a full in-app notification centre integrated into the customer portal and global header. In-app notifications inform customers in real time about order lifecycle changes, payment confirmations, shipping updates, refund notes, customer support responses, and account security notices.

## 2. In-App Notification Model (`Notification.model.ts`)

Each notification is stored in MongoDB with the following schema:
- `recipientId` (`ObjectId`, ref: `User`): The user who owns the notification.
- `type` (`NotificationType` enum): E.g., `ORDER_CONFIRMED`, `PAYMENT_SUCCESS`, `SECURITY_ALERT`.
- `title` (string, max 160 chars): Header text.
- `message` (string, max 1000 chars): Concise, professional notification description.
- `priority` (`NotificationPriority` enum): `LOW`, `NORMAL`, `HIGH`, `URGENT`. Defaults to `NORMAL`.
- `actionUrl` (string, optional): Internal application link (e.g., `/orders/ORD-20261106-001`).
- `relatedResource` (object, optional): `{ resourceType: 'order' | 'payment' | 'shipment' | 'ticket', resourceId: string }`.
- `isRead` (boolean): Default `false`. Set to `true` when marked as read.
- `readAt` (Date, optional): Timestamp when marked as read.
- `metadata` (Record<string, unknown>, optional): Additional event context.
- `createdAt` & `updatedAt` (Timestamps): Automatic Mongoose timestamps.

### Database Indexes
- `{ recipientId: 1, createdAt: -1 }`: Fast customer chronologically-ordered feed queries.
- `{ recipientId: 1, isRead: 1 }`: Fast unread count aggregation and badge display.

## 3. IDOR and Customer Ownership Isolation

Every in-app notification operation strictly enforces user ownership:
- `GET /api/v1/notifications`: Always filters `{ recipientId: req.user._id }`. Customers can never list another user's notifications.
- `PATCH /api/v1/notifications/:id/read`: Queries `{ _id: id, recipientId: req.user._id }`. Returns `404 Not Found` if a customer attempts to mark someone else's notification as read.
- `DELETE /api/v1/notifications/:id`: Queries `{ _id: id, recipientId: req.user._id }`. Returns `404 Not Found` if a customer attempts to delete someone else's notification.
- `PATCH /api/v1/notifications/read-all`: Updates only records where `{ recipientId: req.user._id, isRead: false }`.

## 4. UI Components & Frontend Integration

1. **Header Popover Dropdown (`frontend/src/components/common/Header.tsx`):**
   - Bell icon with dynamic badge displaying unread notification count.
   - TanStack Query polling every 30 seconds for live updates.
   - Quick popover showing recent notifications with "Mark all as read" button.
   - Direct link to full Notification Centre.
2. **Account Sidebar Navigation (`frontend/src/pages/account/AccountLayout.tsx`):**
   - "Notifications" link with live red pill badge when unread notifications exist.
   - "Preferences" link to manage marketing and communication channels.
3. **Full Notification Centre (`frontend/src/pages/account/AccountNotificationsPage.tsx`):**
   - Filter tabs: All, Unread, Orders, Security.
   - Bulk "Mark all as read" button.
   - Individual item click to navigate to destination `actionUrl` and auto-mark as read.
   - Individual item delete button.
   - Pagination controls for high volume feeds.
   - Clear empty states ("You're all caught up!").
