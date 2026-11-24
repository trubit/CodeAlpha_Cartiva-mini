# Cartiva Mini — Admin Coupon & Review Management

## 1. Promotional Coupon & Discount System
The administrative coupon module enables marketing and promotions staff to create, configure, toggle, and audit discount campaigns.

### Key Rules & Invariants
- **Discount Types:**
  - `PERCENTAGE`: Between 1% and 100%. Optional `maxDiscountAmount` capping prevents disproportionate discounts on high-ticket orders.
  - `FIXED`: Specified in major currency units, converted internally to minor units.
- **Validity Bounds:** `startDate` and `expiryDate` validated with ISO 8601 formatting. Coupons cannot be redeemed after expiry.
- **Redemption Limits:** Total usage limits and per-customer limits prevent over-redemption. Checked atomically upon order placement.
- **Minimum Order Requirement:** `minOrderValue` ensures discounts apply only to qualifying checkout subtotal amounts.
- **Endpoints:**
  - `GET /api/v1/admin/coupons`: List all configured promotional vouchers.
  - `POST /api/v1/admin/coupons`: Create new promotion.
  - `PATCH /api/v1/admin/coupons/:couponId`: Update coupon rules.
  - `PATCH /api/v1/admin/coupons/:couponId/status`: Toggle active status.
  - `DELETE /api/v1/admin/coupons/:couponId`: Soft delete/deactivate promotion.

## 2. Product Review & Rating Moderation
The review moderation engine ensures verified shopper authenticity, protects the storefront from abusive content, and computes aggregate product star ratings dynamically.

### Moderation Features
- **Review Lifecycle:** Submitted reviews enter `pending` state for moderation. Administrators may approve or reject.
- **Atomic Product Recalculation:** Upon review approval or deletion, the parent product's `averageRating` and `reviewCount` are atomically recalculated using MongoDB aggregations.
- **Content Integrity:** Customer privacy is preserved; reviewer names and authentic comments are retained without artificial rating inflation.
- **Endpoints:**
  - `GET /api/v1/admin/reviews`: Review moderation queue with product and status filtering.
  - `PATCH /api/v1/admin/reviews/:reviewId/status`: Approve or reject review with optional moderation note.
  - `DELETE /api/v1/admin/reviews/:reviewId`: Remove inappropriate review and update product metrics.
