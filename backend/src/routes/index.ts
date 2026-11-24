import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { docsRouter } from './docs.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { userRouter } from '../modules/user/user.routes.js';
import { adminUserRouter } from '../modules/user/admin-user.routes.js';
import { productRouter, adminProductRouter } from '../modules/product/product.routes.js';
import { categoryRouter, adminCategoryRouter } from '../modules/product/category.routes.js';
import {
  adminInventoryRouter,
  inventoryReservationRouter,
} from '../modules/inventory/inventory.routes.js';
import { cartRouter } from '../modules/cart/cart.routes.js';
import { wishlistRouter } from '../modules/cart/wishlist.routes.js';
import { shippingRouter } from '../modules/shipping/shipping.routes.js';
import { adminShippingRouter } from '../modules/shipping/admin-shipping.routes.js';
import { checkoutRouter } from '../modules/checkout/checkout.routes.js';
import { orderRouter } from '../modules/order/order.routes.js';
import { adminOrderRouter } from '../modules/order/admin-order.routes.js';
import { paymentRouter } from '../modules/payment/payment.routes.js';
import { adminPaymentRouter } from '../modules/payment/admin-payment.routes.js';
import { webhookRouter } from '../modules/payment/webhook.routes.js';
import {
  adminFulfilmentRouter,
  adminShipmentRouter,
} from '../modules/fulfilment/admin-fulfilment.routes.js';
import { adminDashboardRouter } from '../modules/admin/dashboard.routes.js';
import { adminReportRouter } from '../modules/admin/report.routes.js';
import { couponRouter } from '../modules/coupon/coupon.routes.js';
import { adminCouponRouter } from '../modules/coupon/admin-coupon.routes.js';
import { reviewRouter } from '../modules/review/review.routes.js';
import { adminReviewRouter } from '../modules/review/admin-review.routes.js';
import { supportRouter } from '../modules/support/support.routes.js';
import { adminSupportRouter } from '../modules/support/admin-support.routes.js';
import { adminAuditRouter } from '../modules/audit/admin-audit.routes.js';
import { settingsRouter } from '../modules/settings/settings.routes.js';
import { adminSettingsRouter } from '../modules/settings/admin-settings.routes.js';
import { notificationRouter } from '../modules/notifications/notification.routes.js';
import { adminNotificationRouter } from '../modules/notifications/admin-notification.routes.js';
import { tenantRouter } from '../modules/tenant/tenant.routes.js';

export const apiRouter = Router();

// ============================================================================
// 1. Core Infrastructure Routes (Phase 3)
// ============================================================================
apiRouter.use('/health', healthRouter);
apiRouter.use('/docs', docsRouter);

// ============================================================================
// 2. Authentication & Authorization Routes (Phase 5)
// ============================================================================
apiRouter.use('/auth', authRouter);

// ============================================================================
// 3. User Account & Customer Management Routes (Phase 6 & 15)
// ============================================================================
apiRouter.use('/users', userRouter);
apiRouter.use('/admin/users', adminUserRouter);

// ============================================================================
// 4. Product & Category Management Routes (Phase 7)
// ============================================================================
apiRouter.use('/products', productRouter);
apiRouter.use('/admin/products', adminProductRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/admin/categories', adminCategoryRouter);

// ============================================================================
// 5. Inventory & Stock Management Routes (Phase 8)
// ============================================================================
apiRouter.use('/admin/inventory', adminInventoryRouter);
apiRouter.use('/inventory/reservations', inventoryReservationRouter);

// ============================================================================
// 6. Shopping Cart & Wishlist Routes (Phase 10)
// ============================================================================
apiRouter.use('/cart', cartRouter);
apiRouter.use('/wishlist', wishlistRouter);

// ============================================================================
// 7. Shipping & Delivery Management Routes (Phase 11)
// ============================================================================
apiRouter.use('/shipping', shippingRouter);
apiRouter.use('/admin/shipping', adminShippingRouter);

// ============================================================================
// 8. Checkout & Order Processing Routes (Phase 12)
// ============================================================================
apiRouter.use('/checkout', checkoutRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/admin/orders', adminOrderRouter);

// ============================================================================
// 9. Payment Gateway & Financial Processing Routes (Phase 13)
// ============================================================================
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/admin/payments', adminPaymentRouter);
apiRouter.use('/webhooks', webhookRouter);

// ============================================================================
// 10. Order Fulfilment & Delivery Tracking Routes (Phase 14)
// ============================================================================
apiRouter.use('/admin/fulfilment', adminFulfilmentRouter);
apiRouter.use('/admin/shipments', adminShipmentRouter);

// ============================================================================
// 11. Admin Dashboard, Reports, Coupons, Reviews, Support, Audit & Settings (Phase 15)
// ============================================================================
apiRouter.use('/admin/dashboard', adminDashboardRouter);
apiRouter.use('/admin/reports', adminReportRouter);
apiRouter.use('/coupons', couponRouter);
apiRouter.use('/admin/coupons', adminCouponRouter);
apiRouter.use('/reviews', reviewRouter);
apiRouter.use('/admin/reviews', adminReviewRouter);
apiRouter.use('/support', supportRouter);
apiRouter.use('/admin/support', adminSupportRouter);
apiRouter.use('/admin/audit-logs', adminAuditRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/admin/settings', adminSettingsRouter);

// ============================================================================
// 12. Notifications, Emails & Customer Communication Routes (Phase 17)
// ============================================================================
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/admin/notifications', adminNotificationRouter);

// ============================================================================
// 13. Multi-Tenant Enterprise Partitioning (Scalability Layer)
// ============================================================================
apiRouter.use('/tenants', tenantRouter);



