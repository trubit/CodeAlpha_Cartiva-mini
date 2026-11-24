/**
 * Cartiva Mini — Administrator Coupon Routes
 * Mounted at /api/v1/admin/coupons
 */
import { Router } from 'express';
import { couponController } from './coupon.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { createCouponSchema, updateCouponSchema } from './coupon.validator.js';
import { UserRole } from '@shared/enums.js';

export const adminCouponRouter = Router();

// Enforce authentication & Administrator/Staff permissions
adminCouponRouter.use(authenticate, requireRole(UserRole.ADMIN, UserRole.STAFF));

adminCouponRouter.get(
  '/',
  asyncHandler((req, res) => couponController.listCoupons(req, res))
);

adminCouponRouter.get(
  '/:couponId',
  asyncHandler((req, res) => couponController.getCoupon(req, res))
);

adminCouponRouter.post(
  '/',
  validateRequest({ body: createCouponSchema }),
  asyncHandler((req, res) => couponController.createCoupon(req, res))
);

adminCouponRouter.patch(
  '/:couponId',
  validateRequest({ body: updateCouponSchema }),
  asyncHandler((req, res) => couponController.updateCoupon(req, res))
);

adminCouponRouter.patch(
  '/:couponId/status',
  asyncHandler((req, res) => couponController.toggleStatus(req, res))
);

adminCouponRouter.delete(
  '/:couponId',
  asyncHandler((req, res) => couponController.deleteCoupon(req, res))
);
