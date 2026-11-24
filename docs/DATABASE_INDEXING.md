# Cartiva Mini — Database Indexing Strategy & Query Optimization

**Document Version:** 1.0.0  
**Phase:** Phase 4: MongoDB Database Architecture & Data Management  
**Date:** November 2026  
**Status:** Approved & Implemented  
**Classification:** Database Architecture Deliverable

---

## 1. Indexing Strategy & Performance Principles

In high-concurrency commercial e-commerce, indexes are the primary defense against collection scans (`COLLSCAN`), elevated CPU utilization, and slow queries.

Cartiva Mini follows strict index engineering principles:

1. **The ESR (Equality, Sort, Range) Rule:** Compound indexes are structured with Equality fields first, followed by Sort fields, and finally Range filter fields.
2. **Selective Cardinality:** Only fields with high selectivity (unique keys, user IDs, categorizations) are indexed. Low-cardinality boolean fields are indexed exclusively as part of compound indexes.
3. **Sparse & Partial Indexes:** Used for optional or null-heavy unique fields (e.g., `emailVerificationToken`, guest `sessionId`) to conserve memory and disk footprint.
4. **TTL (Time-To-Live) Automated Cleanups:** Applied to ephemeral records (such as abandoned guest carts and aging notifications) so the database self-prunes without external cron scripts.
5. **Full-Text Search:** Optimized text index on products for instant multilingual/multiterm discovery without third-party search engine complexity at this scale.

---

## 2. Complete Index Catalog Across 16 Collections

### 2.1 User Management (`users`)

| Index Keys                      | Type     | Purpose / Query Supported                             |
| :------------------------------ | :------- | :---------------------------------------------------- |
| `{ email: 1 }`                  | Unique   | User login lookup, registration duplicate checks      |
| `{ role: 1 }`                   | Standard | Admin user filtering (e.g., list all staff or admins) |
| `{ emailVerificationToken: 1 }` | Sparse   | Verification link resolution                          |
| `{ passwordResetToken: 1 }`     | Sparse   | Password recovery link validation                     |
| `{ createdAt: -1 }`             | Standard | Chronological user management in admin portal         |

### 2.2 Product Catalog (`products`)

| Index Keys                                                                 | Type           | Purpose / Query Supported                                                |
| :------------------------------------------------------------------------- | :------------- | :----------------------------------------------------------------------- |
| `{ slug: 1 }`                                                              | Unique         | Fast SEO product detail page resolution (`/products/:slug`)              |
| `{ sku: 1 }`                                                               | Unique         | Stock lookup, barcode scanning, warehouse fulfillment                    |
| `{ categoryId: 1, status: 1, regularPrice: 1 }`                            | Compound (ESR) | Catalog browsing by category, filtered by active status, sorted by price |
| `{ status: 1, isFeatured: 1, createdAt: -1 }`                              | Compound       | Homepage featured showcase and new arrivals                              |
| `{ title: "text", shortDescription: "text", brand: "text", tags: "text" }` | Text           | Keyword search with relevance score weighting                            |

### 2.3 Product Categories (`categories`)

| Index Keys                         | Type     | Purpose / Query Supported                         |
| :--------------------------------- | :------- | :------------------------------------------------ |
| `{ slug: 1 }`                      | Unique   | Category URL routing (`/categories/:slug`)        |
| `{ parentId: 1, displayOrder: 1 }` | Compound | Hierarchical navigation tree building and sorting |
| `{ isActive: 1, displayOrder: 1 }` | Compound | Active storefront category bar rendering          |

### 2.4 Shopping Carts (`carts`)

| Index Keys         | Type          | Purpose / Query Supported                                     |
| :----------------- | :------------ | :------------------------------------------------------------ |
| `{ userId: 1 }`    | Unique Sparse | Authenticated customer cart lookup (one active cart per user) |
| `{ sessionId: 1 }` | Unique Sparse | Guest visitor cart lookup (one active cart per session)       |
| `{ expiresAt: 1 }` | TTL Index     | Automatic purge of inactive carts after expiration            |

### 2.5 Wishlists (`wishlists`)

| Index Keys                 | Type     | Purpose / Query Supported                             |
| :------------------------- | :------- | :---------------------------------------------------- |
| `{ userId: 1 }`            | Unique   | Direct customer wishlist retrieval (one per customer) |
| `{ "items.productId": 1 }` | Multikey | Check if a specific product is already wishlisted     |

### 2.6 Customer Addresses (`addresses`)

| Index Keys                            | Type     | Purpose / Query Supported                           |
| :------------------------------------ | :------- | :-------------------------------------------------- |
| `{ userId: 1, isDefaultShipping: 1 }` | Compound | Fast default shipping address retrieval at checkout |
| `{ userId: 1, isDefaultBilling: 1 }`  | Compound | Fast default billing address retrieval              |
| `{ userId: 1, createdAt: -1 }`        | Compound | Customer address book list view                     |

### 2.7 Orders (`orders`)

| Index Keys                            | Type     | Purpose / Query Supported                       |
| :------------------------------------ | :------- | :---------------------------------------------- |
| `{ orderNumber: 1 }`                  | Unique   | Customer order tracking and invoice resolution  |
| `{ userId: 1, createdAt: -1 }`        | Compound | Customer order history ("My Orders" pagination) |
| `{ orderStatus: 1, createdAt: -1 }`   | Compound | Warehouse packing and fulfillment queue         |
| `{ paymentStatus: 1, createdAt: -1 }` | Compound | Finance settlement reconciliation               |

### 2.8 Payments (`payments`)

| Index Keys                     | Type     | Purpose / Query Supported                                 |
| :----------------------------- | :------- | :-------------------------------------------------------- |
| `{ paymentReference: 1 }`      | Unique   | Webhook callback verification and payment gateway lookups |
| `{ orderId: 1 }`               | Unique   | 1:1 order payment resolution                              |
| `{ userId: 1, createdAt: -1 }` | Compound | Customer payment history                                  |
| `{ status: 1, createdAt: -1 }` | Compound | Failed payment reconciliation and retries                 |

### 2.9 Transactions (`transactions`)

| Index Keys                    | Type     | Purpose / Query Supported                       |
| :---------------------------- | :------- | :---------------------------------------------- |
| `{ transactionReference: 1 }` | Unique   | Double-entry ledger audit lookups               |
| `{ paymentId: 1 }`            | Standard | Retrieve all transaction attempts for a payment |
| `{ orderId: 1, type: 1 }`     | Compound | Order refund/reversal validation                |
| `{ createdAt: -1 }`           | Standard | Accounting ledger chronological export          |

### 2.10 Product Reviews (`reviews`)

| Index Keys                                   | Type            | Purpose / Query Supported                    |
| :------------------------------------------- | :-------------- | :------------------------------------------- |
| `{ productId: 1, userId: 1 }`                | Unique Compound | Enforce one review per customer per product  |
| `{ productId: 1, status: 1, createdAt: -1 }` | Compound        | Approved reviews list on product detail page |
| `{ status: 1, createdAt: -1 }`               | Compound        | Moderation queue for staff review            |

### 2.11 Discount Coupons (`coupons`)

| Index Keys                                     | Type     | Purpose / Query Supported                                      |
| :--------------------------------------------- | :------- | :------------------------------------------------------------- |
| `{ code: 1 }`                                  | Unique   | Uppercase coupon validation at checkout (`code.toUpperCase()`) |
| `{ isActive: 1, startDate: 1, expiryDate: 1 }` | Compound | Coupon availability and date validity verification             |

### 2.12 Inventory Movements (`inventory_movements`)

| Index Keys                        | Type     | Purpose / Query Supported                                   |
| :-------------------------------- | :------- | :---------------------------------------------------------- |
| `{ productId: 1, createdAt: -1 }` | Compound | Stock audit trail and ledger history for a product          |
| `{ type: 1, createdAt: -1 }`      | Compound | Movement filtering by type (e.g., all `damage` or `return`) |
| `{ referenceOrderId: 1 }`         | Sparse   | Lookup stock deductions tied to an order                    |

### 2.13 Notifications (`notifications`)

| Index Keys                                     | Type      | Purpose / Query Supported                            |
| :--------------------------------------------- | :-------- | :--------------------------------------------------- |
| `{ recipientId: 1, isRead: 1, createdAt: -1 }` | Compound  | Unread notification badge count and dropdown list    |
| `{ expiresAt: 1 }`                             | TTL Index | Auto-pruning after 90 days (`expireAfterSeconds: 0`) |

### 2.14 Support Tickets (`support_tickets`)

| Index Keys                                  | Type     | Purpose / Query Supported                |
| :------------------------------------------ | :------- | :--------------------------------------- |
| `{ ticketNumber: 1 }`                       | Unique   | Direct ticket lookup by reference number |
| `{ userId: 1, status: 1, updatedAt: -1 }`   | Compound | Customer support dashboard view          |
| `{ status: 1, priority: 1, updatedAt: -1 }` | Compound | Help desk queue prioritization for staff |

### 2.15 Audit Logs (`audit_logs`)

| Index Keys                                  | Type     | Purpose / Query Supported                        |
| :------------------------------------------ | :------- | :----------------------------------------------- |
| `{ entity: 1, entityId: 1, timestamp: -1 }` | Compound | Forensic change timeline for any specific entity |
| `{ actorId: 1, timestamp: -1 }`             | Compound | Activity log per administrative user             |
| `{ action: 1, timestamp: -1 }`              | Compound | Compliance filtering by action type              |

### 2.16 Shipping Configurations (`shipping_configurations`)

| Index Keys                          | Type              | Purpose / Query Supported                                |
| :---------------------------------- | :---------------- | :------------------------------------------------------- |
| `{ statesCovered: 1, isActive: 1 }` | Compound Multikey | Match customer destination state to active shipping rate |

---

## 3. Query Plan Verification & Index Maintenance

All models are configured with strict indexing in their Mongoose schemas.

### 3.1 Explain Plan Inspection Protocol

In production and staging, critical queries must be profiled using MongoDB Explain Plans:

```typescript
const plan = await Product.find({
  categoryId: targetCategoryId,
  status: 'active',
})
  .sort({ regularPrice: 1 })
  .explain('executionStats');

console.log(plan.executionStats.executionStages.stage); // Must be 'IXSCAN', never 'COLLSCAN'
```

### 3.2 Index Build Environment Rules

- **Development/Test:** Mongoose builds indexes automatically on startup (`autoIndex: true`).
- **Production:** In high-volume production deployments with replica sets, automatic index creation on application startup is disabled (`autoIndex: false`) to avoid connection locking during deployments; indexes are managed via structured migration scripts.
