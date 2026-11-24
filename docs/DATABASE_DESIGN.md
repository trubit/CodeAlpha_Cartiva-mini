# Cartiva Mini — Database Architecture & Schema Specification

**Document Version:** 2.0.0  
**Phase:** Phase 4: MongoDB Database Architecture & Data Management  
**Date:** November 2026  
**Status:** Approved & Fully Implemented  
**Classification:** Database Architecture Deliverable

---

## 1. Database Paradigm & Design Principles

Cartiva Mini utilizes **MongoDB** as its primary persistent operational datastore, managed via **Mongoose ODM** within Node.js. The database schema design balances document-oriented embedding for fast read retrieval with normalized references to ensure strict relational integrity for critical financial and inventory operations.

### Key Architectural Guidelines

1. **Financial Immutability:** Orders, Payments, and Transactions are immutable financial records. They capture point-in-time snapshots of product names, unit prices, applied taxes, discounts, and customer billing addresses so subsequent product modifications never distort historical receipts.
2. **Atomic Inventory & Concurrency:** Inventory movements use atomic document updates (`$inc`, conditional query matching `availableQuantity >= requestedQuantity`) and MongoDB multi-document transactions to eliminate race conditions and overselling.
3. **Compound & Query-Driven Indexing:** Indexes are strictly designed around high-frequency application access patterns (e.g., catalog filtering by category + price + status, customer order histories sorted by date).
4. **Data Isolation & Tenant Security:** Every user-owned entity (Address, Cart, Wishlist, Order, Ticket) mandates strict user identity checks (`userId: ObjectId`) to enforce ownership security at the database boundary.

---

## 2. Comprehensive Collection Specifications

---

### Collection 1: `users`

- **Purpose:** Manages user identity, authentication credentials, profile metadata, roles, and security flags for Customers, Staff, and Admins.
- **Important Fields:**
  - `_id`: `ObjectId` (Primary Key)
  - `email`: `String` (Required, Lowercase, Trimmed, Unique)
  - `passwordHash`: `String` (Required, bcrypt hash with work factor 12)
  - `firstName`: `String` (Required, Max 50 chars)
  - `lastName`: `String` (Required, Max 50 chars)
  - `phone`: `String` (Optional, E.164 format)
  - `role`: `String` (Enum: `'customer'`, `'staff'`, `'admin'`; Default: `'customer'`)
  - `isEmailVerified`: `Boolean` (Default: `false`)
  - `emailVerificationToken`: `String` (Hashed token; Sparse index)
  - `emailVerificationExpires`: `Date`
  - `passwordResetToken`: `String` (Hashed token; Sparse index)
  - `passwordResetExpires`: `Date`
  - `failedLoginAttempts`: `Number` (Default: `0`)
  - `lockUntil`: `Date` (For brute-force mitigation)
  - `lastLoginAt`: `Date`
  - `isActive`: `Boolean` (Default: `true`)
  - `createdAt`: `Date` (Timestamp)
  - `updatedAt`: `Date` (Timestamp)
- **Relationships:**
  - One-to-Many with `addresses`, `orders`, `reviews`, `support_tickets`, `notifications`.
  - One-to-One with `carts`, `wishlists`.
- **Required Indexes:**
  - `{ email: 1 }` (Unique)
  - `{ role: 1 }`
  - `{ emailVerificationToken: 1 }` (Sparse)
  - `{ passwordResetToken: 1 }` (Sparse)
  - `{ createdAt: -1 }`
- **Validation Requirements:** Valid RFC 5322 email regex; password hashed before persistence; non-empty names.
- **Security Considerations:** Never include `passwordHash`, `passwordResetToken`, or `emailVerificationToken` in query projection responses by default (`select: false`).

---

### Collection 2: `products`

- **Purpose:** Stores comprehensive product catalog data, SKU identifiers, pricing, categorization, media assets, variants, and SEO metadata.
- **Important Fields:**
  - `_id`: `ObjectId` (Primary Key)
  - `title`: `String` (Required, Trimmed, Max 180 chars)
  - `slug`: `String` (Required, Unique, Lowercase, URL-safe)
  - `sku`: `String` (Required, Unique, Uppercase, Trimmed)
  - `barcode`: `String` (Optional, UPC/EAN)
  - `brand`: `String` (Optional, Trimmed)
  - `shortDescription`: `String` (Required, Max 300 chars)
  - `fullDescription`: `String` (Required, Markdown/HTML sanitized)
  - `regularPrice`: `Number` (Required, Min: 0.01)
  - `salePrice`: `Number` (Optional, Min: 0)
  - `costPrice`: `Number` (Optional, Admin-only visibility, Min: 0)
  - `currency`: `String` (Default: `'NGN'`)
  - `categoryId`: `ObjectId` (Required, Ref: `'Category'`)
  - `subCategoryId`: `ObjectId` (Optional, Ref: `'Category'`)
  - `images`: `Array` of Objects:
    - `publicId`: `String` (Cloudinary asset ID)
    - `url`: `String` (Secure CDN URL)
    - `alt`: `String`
    - `isThumbnail`: `Boolean`
    - `displayOrder`: `Number`
  - `hasVariants`: `Boolean` (Default: `false`)
  - `variants`: `Array` of Objects:
    - `variantId`: `ObjectId`
    - `sku`: `String` (Unique across variants)
    - `title`: `String` (e.g., "Size: XL, Color: Obsidian")
    - `attributes`: `Map` of `String` (e.g. `{ size: 'XL', color: 'Black' }`)
    - `price`: `Number`
    - `stockQuantity`: `Number` (Min: 0)
    - `imageUrl`: `String`
  - `stockQuantity`: `Number` (Required, Min: 0, Cached total)
  - `lowStockThreshold`: `Number` (Default: 5)
  - `weightGrams`: `Number` (For shipping calculations)
  - `dimensions`: Object `{ length: Number, width: Number, height: Number, unit: String }`
  - `averageRating`: `Number` (Default: 0, Min: 0, Max: 5)
  - `reviewCount`: `Number` (Default: 0)
  - `status`: `String` (Enum: `'draft'`, `'published'`, `'archived'`; Default: `'draft'`)
  - `featured`: `Boolean` (Default: `false`)
  - `tags`: `[String]`
  - `seo`: Object `{ metaTitle: String, metaDescription: String, keywords: [String] }`
  - `createdAt`: `Date`
  - `updatedAt`: `Date`
- **Relationships:** Belongs to `categories`; referenced by `carts`, `wishlists`, `orders`, `inventory_movements`, `reviews`.
- **Required Indexes:**
  - `{ sku: 1 }` (Unique)
  - `{ slug: 1 }` (Unique)
  - `{ categoryId: 1, status: 1, regularPrice: 1 }` (Compound Catalog Query)
  - `{ status: 1, featured: 1, averageRating: -1 }` (Storefront Promotion Query)
  - `{ title: 'text', shortDescription: 'text', brand: 'text', tags: 'text' }` (Full-Text Search Index)
- **Validation Requirements:** `salePrice` must be less than `regularPrice`; `stockQuantity` >= 0; unique SKU check.
- **Security Considerations:** `costPrice` must be restricted from non-admin API responses.

---

### Collection 3: `categories`

- **Purpose:** Represents hierarchical product taxonomy (parent and subcategories) for catalog navigation and filtering.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `name`: `String` (Required, Trimmed, Max 80 chars)
  - `slug`: `String` (Required, Unique, Lowercase)
  - `description`: `String` (Optional, Max 400 chars)
  - `parentId`: `ObjectId` (Optional, Ref: `'Category'`, Default: `null` for root)
  - `imageUrl`: `String` (Cloudinary URL)
  - `displayOrder`: `Number` (Default: 0)
  - `isActive`: `Boolean` (Default: `true`)
  - `createdAt`: `Date`
  - `updatedAt`: `Date`
- **Relationships:** Self-referencing parent-child tree; referenced by `products`.
- **Required Indexes:**
  - `{ slug: 1 }` (Unique)
  - `{ parentId: 1, displayOrder: 1 }`
- **Validation Requirements:** Cannot set `parentId` to self; name cannot be empty.
- **Security Considerations:** Admin-only write access.

---

### Collection 4: `carts`

- **Purpose:** Stores customer shopping cart state, supports guest carts via session UUIDs, and enables persistent cart recovery across sessions.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `userId`: `ObjectId` (Optional, Ref: `'User'`, Sparse)
  - `sessionId`: `String` (Optional, For guest shoppers, Sparse)
  - `items`: `Array` of Objects:
    - `productId`: `ObjectId` (Required, Ref: `'Product'`)
    - `variantId`: `ObjectId` (Optional)
    - `sku`: `String`
    - `title`: `String`
    - `unitPrice`: `Number` (Snapshot at time of addition)
    - `quantity`: `Number` (Required, Min: 1)
    - `thumbnailUrl`: `String`
  - `couponCode`: `String` (Optional)
  - `discountAmount`: `Number` (Default: 0)
  - `subtotal`: `Number` (Calculated)
  - `expiresAt`: `Date` (TTL index for abandoned cart cleanup)
  - `createdAt`: `Date`
  - `updatedAt`: `Date`
- **Relationships:** Belongs to `users`; references `products`.
- **Required Indexes:**
  - `{ userId: 1 }` (Unique, Sparse)
  - `{ sessionId: 1 }` (Unique, Sparse)
  - `{ expiresAt: 1 }` (TTL Index: auto-expire guest carts after 30 days)
- **Validation Requirements:** Minimum 1 item quantity; at least one of `userId` or `sessionId` must be present.
- **Security Considerations:** Strict authorization: users can only read or update their own cart document.

---

### Collection 5: `wishlists`

- **Purpose:** Enables authenticated customers to bookmark favorite products for future purchasing.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `userId`: `ObjectId` (Required, Unique, Ref: `'User'`)
  - `items`: `Array` of Objects:
    - `productId`: `ObjectId` (Required, Ref: `'Product'`)
    - `addedAt`: `Date` (Default: `Date.now`)
  - `createdAt`: `Date`
  - `updatedAt`: `Date`
- **Relationships:** Belongs to `users`; references `products`.
- **Required Indexes:**
  - `{ userId: 1 }` (Unique)
  - `{ 'items.productId': 1 }`
- **Validation Requirements:** Prevent duplicate `productId` in `items` array.
- **Security Considerations:** Strictly isolated to the owning user.

---

### Collection 6: `orders`

- **Purpose:** Canonical record of customer purchase agreements, tracking items, addresses, monetary values, and fulfilment states.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `orderNumber`: `String` (Required, Unique, e.g. `'ORD-202611-8934'`)
  - `userId`: `ObjectId` (Required, Ref: `'User'`)
  - `customerEmail`: `String` (Required, Snapshot)
  - `customerPhone`: `String` (Required, Snapshot)
  - `items`: `Array` of Objects (Immutable snapshot):
    - `productId`: `ObjectId` (Ref: `'Product'`)
    - `variantId`: `ObjectId`
    - `sku`: `String`
    - `title`: `String`
    - `unitPrice`: `Number`
    - `quantity`: `Number`
    - `subtotal`: `Number`
    - `thumbnailUrl`: `String`
  - `shippingAddress`: Object (Immutable snapshot of recipient, street, city, state, country, zip)
  - `billingAddress`: Object
  - `subtotal`: `Number`
  - `discountAmount`: `Number` (Default: 0)
  - `couponCode`: `String`
  - `shippingFee`: `Number` (Default: 0)
  - `taxAmount`: `Number` (Default: 0)
  - `totalAmount`: `Number` (Required, Formula: subtotal - discount + shipping + tax)
  - `currency`: `String` (Default: `'NGN'`)
  - `orderStatus`: `String` (Enum: `'pending_payment'`, `'processing'`, `'packed'`, `'shipped'`, `'delivered'`, `'cancelled'`, `'refunded'`; Default: `'pending_payment'`)
  - `paymentStatus`: `String` (Enum: `'pending'`, `'paid'`, `'failed'`, `'refunded'`; Default: `'pending'`)
  - `paymentId`: `ObjectId` (Ref: `'Payment'`)
  - `trackingNumber`: `String` (Optional)
  - `carrier`: `String` (Optional)
  - `estimatedDeliveryDate`: `Date`
  - `cancelledAt`: `Date`
  - `cancellationReason`: `String`
  - `notes`: `String`
  - `createdAt`: `Date`
  - `updatedAt`: `Date`
- **Relationships:** Belongs to `users`; links to `payments`, `addresses`; references `products`.
- **Required Indexes:**
  - `{ orderNumber: 1 }` (Unique)
  - `{ userId: 1, createdAt: -1 }` (Customer Order History)
  - `{ orderStatus: 1, paymentStatus: 1, createdAt: -1 }` (Admin Order Management)
- **Validation Requirements:** Items array must not be empty; total must be non-negative; status transitions must follow valid workflow.
- **Security Considerations:** Customers can only view their own orders; admin/staff permissions required for status mutations.

---

### Collection 7: `payments`

- **Purpose:** Tracks payment attempts, processor transactions, verification records, and gateway communication.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `paymentReference`: `String` (Required, Unique, e.g. `'PAY-202611-48291'`)
  - `orderId`: `ObjectId` (Required, Ref: `'Order'`)
  - `userId`: `ObjectId` (Required, Ref: `'User'`)
  - `amount`: `Number` (Required, In smallest currency unit or major decimal)
  - `currency`: `String` (Default: `'NGN'`)
  - `gateway`: `String` (Default: `'paystack'`)
  - `gatewayTransactionId`: `String` (From Paystack payload)
  - `channel`: `String` (Card, bank, ussd, qr)
  - `status`: `String` (Enum: `'initialized'`, `'pending'`, `'success'`, `'failed'`, `'reversed'`; Default: `'initialized'`)
  - `gatewayResponse`: `Map` / `Object` (Sanitized response data)
  - `ipAddress`: `String`
  - `paidAt`: `Date`
  - `verifiedAt`: `Date`
  - `createdAt`: `Date`
  - `updatedAt`: `Date`
- **Relationships:** Belongs to `orders` and `users`; links to `transactions`.
- **Required Indexes:**
  - `{ paymentReference: 1 }` (Unique)
  - `{ orderId: 1 }` (Unique)
  - `{ status: 1, createdAt: -1 }`
  - `{ gatewayTransactionId: 1 }` (Sparse)
- **Validation Requirements:** Amount must strictly match `order.totalAmount`.
- **Security Considerations:** Never store customer credit card numbers, CVVs, or card PINs. PCI-DSS compliance delegates card intake exclusively to Paystack.

---

### Collection 8: `transactions`

- **Purpose:** Double-entry ledger recording all credit, debit, and refund financial events for auditing and accounting.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `transactionReference`: `String` (Required, Unique)
  - `paymentId`: `ObjectId` (Ref: `'Payment'`)
  - `orderId`: `ObjectId` (Ref: `'Order'`)
  - `userId`: `ObjectId` (Ref: `'User'`)
  - `type`: `String` (Enum: `'charge'`, `'refund'`, `'payout'`, `'adjustment'`)
  - `amount`: `Number` (Required)
  - `currency`: `String` (Default: `'NGN'`)
  - `gatewayFee`: `Number` (Processor fee deduction)
  - `netAmount`: `Number` (Amount minus processor fee)
  - `balanceBefore`: `Number`
  - `balanceAfter`: `Number`
  - `description`: `String`
  - `timestamp`: `Date` (Default: `Date.now`)
- **Relationships:** References `payments`, `orders`, and `users`.
- **Required Indexes:**
  - `{ transactionReference: 1 }` (Unique)
  - `{ paymentId: 1 }`
  - `{ type: 1, timestamp: -1 }`
- **Validation Requirements:** Immutable record; updates and deletes disallowed once created.
- **Security Considerations:** Admin-only access. Full audit logging on any adjustments.

---

### Collection 9: `reviews`

- **Purpose:** Stores customer feedback, ratings (1–5 stars), written reviews, and moderation status for purchased products.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `productId`: `ObjectId` (Required, Ref: `'Product'`)
  - `userId`: `ObjectId` (Required, Ref: `'User'`)
  - `orderId`: `ObjectId` (Required, Ref: `'Order'`, Verified Buyer verification)
  - `rating`: `Number` (Required, Integer: 1 to 5)
  - `title`: `String` (Required, Max 100 chars)
  - `comment`: `String` (Required, Max 1500 chars)
  - `images`: `[String]` (Optional Cloudinary URLs)
  - `isVerifiedBuyer`: `Boolean` (Default: `true`)
  - `status`: `String` (Enum: `'pending'`, `'approved'`, `'rejected'`; Default: `'approved'`)
  - `helpfulVotes`: `Number` (Default: 0)
  - `createdAt`: `Date`
  - `updatedAt`: `Date`
- **Relationships:** Belongs to `products`, `users`, and `orders`.
- **Required Indexes:**
  - `{ productId: 1, userId: 1 }` (Unique compound: One review per user per product)
  - `{ productId: 1, status: 1, rating: -1 }` (Catalog Review Query)
- **Validation Requirements:** Rating must be integer between 1 and 5; user must have a completed order containing the product.
- **Security Considerations:** Anti-spam rate limiting; text sanitization to block XSS payloads.

---

### Collection 10: `coupons`

- **Purpose:** Stores promotional discount codes, validity periods, redemption constraints, and usage limits.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `code`: `String` (Required, Unique, Uppercase, Trimmed)
  - `description`: `String`
  - `discountType`: `String` (Enum: `'percentage'`, `'fixed'`)
  - `discountValue`: `Number` (Required, e.g. 15 for 15% or 2000 for ₦2,000)
  - `minOrderValue`: `Number` (Default: 0)
  - `maxDiscountAmount`: `Number` (Optional ceiling for percentage discounts)
  - `startDate`: `Date` (Required)
  - `expiryDate`: `Date` (Required)
  - `usageLimitTotal`: `Number` (Optional total capacity)
  - `usageLimitPerUser`: `Number` (Default: 1)
  - `usedCount`: `Number` (Default: 0)
  - `applicableCategories`: `[ObjectId]` (Ref: `'Category'`)
  - `applicableProducts`: `[ObjectId]` (Ref: `'Product'`)
  - `isActive`: `Boolean` (Default: `true`)
  - `createdAt`: `Date`
  - `updatedAt`: `Date`
- **Relationships:** Referenced by `orders` and `carts`.
- **Required Indexes:**
  - `{ code: 1 }` (Unique)
  - `{ isActive: 1, startDate: 1, expiryDate: 1 }`
- **Validation Requirements:** `expiryDate` must be after `startDate`; `discountValue` > 0; if percentage, `discountValue` <= 100.
- **Security Considerations:** Atomic increment of `usedCount` during order placement to prevent race-condition over-redemption.

---

### Collection 11: `addresses`

- **Purpose:** Stores customer shipping and billing postal addresses for fast checkout reuse.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `userId`: `ObjectId` (Required, Ref: `'User'`)
  - `recipientName`: `String` (Required, Max 100 chars)
  - `phone`: `String` (Required, E.164 format)
  - `streetAddress`: `String` (Required)
  - `apartmentSuite`: `String` (Optional)
  - `city`: `String` (Required)
  - `state`: `String` (Required)
  - `postalCode`: `String` (Optional)
  - `country`: `String` (Required, Default: `'Nigeria'`)
  - `isDefaultShipping`: `Boolean` (Default: `false`)
  - `isDefaultBilling`: `Boolean` (Default: `false`)
  - `createdAt`: `Date`
  - `updatedAt`: `Date`
- **Relationships:** Belongs to `users`.
- **Required Indexes:**
  - `{ userId: 1, isDefaultShipping: 1 }`
  - `{ userId: 1, createdAt: -1 }`
- **Validation Requirements:** Valid phone format; required address lines. Setting default resets any previous default.
- **Security Considerations:** Strict user ownership checks on all read/write/delete operations.

---

### Collection 12: `inventory_movements`

- **Purpose:** Full audit ledger tracking every stock addition, reservation, deduction, cancellation return, or manual adjustment.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `productId`: `ObjectId` (Required, Ref: `'Product'`)
  - `variantId`: `ObjectId` (Optional)
  - `sku`: `String` (Required)
  - `movementType`: `String` (Enum: `'restock'`, `'reservation'`, `'purchase_deduction'`, `'reservation_release'`, `'return_restock'`, `'manual_adjustment'`)
  - `quantity`: `Number` (Required, Positive for inflow, Negative for outflow)
  - `previousStock`: `Number` (Required)
  - `newStock`: `Number` (Required)
  - `referenceType`: `String` (Enum: `'order'`, `'purchase_order'`, `'manual'`)
  - `referenceId`: `String` (e.g. Order ID)
  - `operatorId`: `ObjectId` (Optional, Ref: `'User'`)
  - `reason`: `String` (Required)
  - `timestamp`: `Date` (Default: `Date.now`)
- **Relationships:** References `products` and `users`.
- **Required Indexes:**
  - `{ productId: 1, timestamp: -1 }`
  - `{ sku: 1, timestamp: -1 }`
  - `{ movementType: 1, timestamp: -1 }`
- **Validation Requirements:** Immutable records; `newStock` must equal `previousStock + quantity`.
- **Security Considerations:** Admin/Staff role required for manual adjustments.

---

### Collection 13: `notifications`

- **Purpose:** Delivers in-app alerts and notifications to customers (order status updates, promotions) and administrators (low stock alerts, new orders).
- **Important Fields:**
  - `_id`: `ObjectId`
  - `recipientId`: `ObjectId` (Required, Ref: `'User'`)
  - `type`: `String` (Enum: `'order_status'`, `'payment_success'`, `'low_stock'`, `'system_alert'`, `'promotion'`)
  - `title`: `String` (Required)
  - `message`: `String` (Required)
  - `actionUrl`: `String` (Optional deep link)
  - `isRead`: `Boolean` (Default: `false`)
  - `readAt`: `Date`
  - `createdAt`: `Date`
- **Relationships:** Belongs to `users`.
- **Required Indexes:**
  - `{ recipientId: 1, isRead: 1, createdAt: -1 }`
  - `{ createdAt: 1 }` (TTL: auto-purge read notifications older than 90 days)
- **Validation Requirements:** Non-empty title and message.
- **Security Considerations:** Users can only query and mark their own notifications as read.

---

### Collection 14: `support_tickets`

- **Purpose:** Customer support ticketing system enabling shoppers to submit inquiries, return requests, and track staff responses.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `ticketNumber`: `String` (Required, Unique, e.g. `'TCK-202611-304'`)
  - `userId`: `ObjectId` (Required, Ref: `'User'`)
  - `orderId`: `ObjectId` (Optional, Ref: `'Order'`)
  - `subject`: `String` (Required, Max 200 chars)
  - `category`: `String` (Enum: `'order_inquiry'`, `'product_question'`, `'payment_issue'`, `'return_refund'`, `'general'`)
  - `priority`: `String` (Enum: `'low'`, `'medium'`, `'high'`, `'urgent'`; Default: `'medium'`)
  - `status`: `String` (Enum: `'open'`, `'in_progress'`, `'waiting_on_customer'`, `'resolved'`, `'closed'`; Default: `'open'`)
  - `messages`: `Array` of Objects:
    - `messageId`: `ObjectId`
    - `senderId`: `ObjectId` (Ref: `'User'`)
    - `senderRole`: `String` (Enum: `'customer'`, `'staff'`, `'admin'`)
    - `content`: `String` (Required)
    - `attachments`: `[String]` (Cloudinary URLs)
    - `sentAt`: `Date` (Default: `Date.now`)
  - `assignedTo`: `ObjectId` (Optional, Ref: `'User'`)
  - `closedAt`: `Date`
  - `createdAt`: `Date`
  - `updatedAt`: `Date`
- **Relationships:** Belongs to `users`; optionally references `orders`.
- **Required Indexes:**
  - `{ ticketNumber: 1 }` (Unique)
  - `{ userId: 1, status: 1, updatedAt: -1 }`
  - `{ status: 1, priority: 1, updatedAt: -1 }` (Admin Queue)
- **Validation Requirements:** Initial message required on creation; status transitions validated.
- **Security Considerations:** Customers can only view their own tickets; staff cannot access unauthorized internal admin actions.

---

### Collection 15: `audit_logs`

- **Purpose:** Immutable compliance and forensic log recording all administrative modifications, authentication anomalies, and sensitive data changes.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `actorId`: `ObjectId` (Ref: `'User'`, Null if system)
  - `actorRole`: `String` (e.g. `'admin'`, `'staff'`, `'system'`)
  - `action`: `String` (e.g. `'PRODUCT_PRICE_UPDATED'`, `'ORDER_STATUS_CHANGED'`, `'COUPON_CREATED'`, `'USER_SUSPENDED'`)
  - `entity`: `String` (e.g. `'Product'`, `'Order'`, `'User'`)
  - `entityId`: `String` (Target identifier)
  - `ipAddress`: `String` (Client IP)
  - `userAgent`: `String`
  - `changesDiff`: Object `{ before: Object, after: Object }`
  - `timestamp`: `Date` (Default: `Date.now`)
- **Relationships:** References `users`.
- **Required Indexes:**
  - `{ entity: 1, entityId: 1, timestamp: -1 }`
  - `{ actorId: 1, timestamp: -1 }`
  - `{ action: 1, timestamp: -1 }`
- **Validation Requirements:** Strict append-only; update and delete operations prohibited at MongoDB driver level.
- **Security Considerations:** Stored securely; restricted exclusively to system automated triggers and super-admin viewing.

---

### Collection 16: `shipping_configurations`

- **Purpose:** Configures geographic shipping zones, carrier integrations, flat/weight-based delivery rates, and estimated transit times.
- **Important Fields:**
  - `_id`: `ObjectId`
  - `zoneName`: `String` (Required, e.g. `'Lagos Island'`, `'Lagos Mainland'`, `'Rest of Nigeria'`)
  - `statesCovered`: `[String]` (Required list of states/regions)
  - `carrierName`: `String` (Required, e.g. `'Internal Fleet'`, `'GIG Logistics'`, `'DHL'`)
  - `rateCalculationType`: `String` (Enum: `'flat'`, `'weight_tiered'`, `'free_above_threshold'`)
  - `baseRate`: `Number` (Required, Min: 0)
  - `ratePerAdditionalKg`: `Number` (Default: 0)
  - `freeShippingThreshold`: `Number` (Optional)
  - `estimatedDeliveryDaysMin`: `Number` (Required, e.g. 1)
  - `estimatedDeliveryDaysMax`: `Number` (Required, e.g. 3)
  - `isActive`: `Boolean` (Default: `true`)
  - `createdAt`: `Date`
  - `updatedAt`: `Date`
- **Relationships:** Referenced dynamically by Checkout engine to compute `orders.shippingFee`.
- **Required Indexes:**
  - `{ statesCovered: 1, isActive: 1 }`
- **Validation Requirements:** Minimum delivery days must not exceed maximum; base rate >= 0.
- **Security Considerations:** Admin-only configuration privileges.

---

## 3. Data Integrity & Index Summary Matrix

| Collection                | Primary Unique Index                    | Compound Performance Index                      | Critical Security Constraint                             |
| ------------------------- | --------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| `users`                   | `email`                                 | None                                            | Passwords hashed with bcrypt; token projections excluded |
| `products`                | `sku`, `slug`                           | `{ categoryId: 1, status: 1, regularPrice: 1 }` | `costPrice` masked for non-admins; text index for search |
| `categories`              | `slug`                                  | `{ parentId: 1, displayOrder: 1 }`              | Admin-only modifications                                 |
| `carts`                   | `userId` (sparse), `sessionId` (sparse) | TTL `{ expiresAt: 1 }`                          | Isolated by user ownership; stock checked on update      |
| `wishlists`               | `userId`                                | `{ 'items.productId': 1 }`                      | Isolated by user ownership                               |
| `orders`                  | `orderNumber`                           | `{ userId: 1, createdAt: -1 }`                  | Financial snapshots immutable; strict status flow        |
| `payments`                | `paymentReference`, `orderId`           | `{ status: 1, createdAt: -1 }`                  | Zero card details stored; server-side verification       |
| `transactions`            | `transactionReference`                  | `{ type: 1, timestamp: -1 }`                    | Append-only ledger; updates forbidden                    |
| `reviews`                 | `{ productId: 1, userId: 1 }`           | `{ productId: 1, status: 1 }`                   | Verified buyer validation; XSS sanitization              |
| `coupons`                 | `code`                                  | `{ isActive: 1, startDate: 1, expiryDate: 1 }`  | Atomic usage count increment to prevent over-use         |
| `addresses`               | None                                    | `{ userId: 1, isDefaultShipping: 1 }`           | User isolation; default address uniqueness               |
| `inventory_movements`     | None                                    | `{ productId: 1, timestamp: -1 }`               | Immutable ledger; math verification (`new = old + qty`)  |
| `notifications`           | None                                    | `{ recipientId: 1, isRead: 1, createdAt: -1 }`  | User ownership isolation; 90-day TTL                     |
| `support_tickets`         | `ticketNumber`                          | `{ userId: 1, status: 1, updatedAt: -1 }`       | Customer read isolation; RBAC for responses              |
| `audit_logs`              | None                                    | `{ entity: 1, entityId: 1, timestamp: -1 }`     | Immutable append-only; super-admin read only             |
| `shipping_configurations` | None                                    | `{ statesCovered: 1, isActive: 1 }`             | Admin-only rate configuration                            |

---

## 4. Phase 4 Implementation & Code Mapping

All 16 database models have been fully implemented in TypeScript using Mongoose 8.x with matching shared types in `shared/types/`:

| Collection                | Model Implementation File                           | Interface Type (`shared/types/models.types.ts`) | Integration Test File           |
| :------------------------ | :-------------------------------------------------- | :---------------------------------------------- | :------------------------------ |
| `users`                   | `backend/src/models/User.model.ts`                  | `IUser`                                         | `tests/database-models.test.ts` |
| `categories`              | `backend/src/models/Category.model.ts`              | `ICategory`                                     | `tests/database-models.test.ts` |
| `products`                | `backend/src/models/Product.model.ts`               | `IProduct`                                      | `tests/database-models.test.ts` |
| `carts`                   | `backend/src/models/Cart.model.ts`                  | `ICart`                                         | `tests/database-models.test.ts` |
| `wishlists`               | `backend/src/models/Wishlist.model.ts`              | `IWishlist`                                     | `tests/database-models.test.ts` |
| `orders`                  | `backend/src/models/Order.model.ts`                 | `IOrder`                                        | `tests/database-models.test.ts` |
| `payments`                | `backend/src/models/Payment.model.ts`               | `IPayment`                                      | `tests/database-models.test.ts` |
| `transactions`            | `backend/src/models/Transaction.model.ts`           | `ITransaction`                                  | `tests/database-models.test.ts` |
| `reviews`                 | `backend/src/models/Review.model.ts`                | `IReview`                                       | `tests/database-models.test.ts` |
| `coupons`                 | `backend/src/models/Coupon.model.ts`                | `ICoupon`                                       | `tests/database-models.test.ts` |
| `addresses`               | `backend/src/models/Address.model.ts`               | `IAddress`                                      | `tests/database-models.test.ts` |
| `inventory_movements`     | `backend/src/models/InventoryMovement.model.ts`     | `IInventoryMovement`                            | `tests/database-models.test.ts` |
| `notifications`           | `backend/src/models/Notification.model.ts`          | `INotification`                                 | `tests/database-models.test.ts` |
| `support_tickets`         | `backend/src/models/SupportTicket.model.ts`         | `ISupportTicket`                                | `tests/database-models.test.ts` |
| `audit_logs`              | `backend/src/models/AuditLog.model.ts`              | `IAuditLog`                                     | `tests/database-models.test.ts` |
| `shipping_configurations` | `backend/src/models/ShippingConfiguration.model.ts` | `IShippingConfiguration`                        | `tests/database-models.test.ts` |

All models are exported via `backend/src/models/index.ts` and verified with automated test suites.
