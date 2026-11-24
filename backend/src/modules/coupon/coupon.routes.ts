/**
 * Cartiva Mini — Public Coupon Routes
 * Mounted at /api/v1/coupons
 */
import { Router } from 'express';
import { couponController } from './coupon.controller.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { validateCouponSchema } from './coupon.validator.js';

export const couponRouter = Router();

// Public coupon validation endpoint (used during cart & checkout)
couponRouter.post(
  '/validate',
  validateRequest({ body: validateCouponSchema }),
  asyncHandler((req, res) => couponController.validateCoupon(req, res))
);
