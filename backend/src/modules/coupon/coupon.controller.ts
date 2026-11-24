/**
 * Cartiva Mini — Coupon Controller
 * Handles customer and admin coupon endpoints.
 */
import type { Request, Response } from 'express';
import { couponService } from './coupon.service.js';
import { sendSuccess } from '../../utils/response.util.js';
import { HttpStatus } from '../../constants/httpStatusCodes.js';

class CouponController {
  // Public customer validation
  public async validateCoupon(req: Request, res: Response): Promise<void> {
    const { code, subtotal } = req.body;
    const result = await couponService.validateCoupon(code, subtotal);
    sendSuccess(res, result, result.message);
  }

  // Admin listing
  public async listCoupons(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const search = req.query.search as string | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const result = await couponService.listCoupons({ page, limit, search, isActive });
    sendSuccess(res, result, 'Coupons retrieved successfully.');
  }

  // Admin get single
  public async getCoupon(req: Request, res: Response): Promise<void> {
    const { couponId } = req.params;
    const coupon = await couponService.getCouponById(couponId!);
    sendSuccess(res, coupon, 'Coupon retrieved successfully.');
  }

  // Admin create
  public async createCoupon(req: Request, res: Response): Promise<void> {
    const adminId = req.user?.userId;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const coupon = await couponService.createCoupon(req.body, adminId, context);
    sendSuccess(res, coupon, 'Coupon created successfully.', HttpStatus.CREATED);
  }

  // Admin update
  public async updateCoupon(req: Request, res: Response): Promise<void> {
    const { couponId } = req.params;
    const adminId = req.user?.userId;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const coupon = await couponService.updateCoupon(couponId!, req.body, adminId, context);
    sendSuccess(res, coupon, 'Coupon updated successfully.');
  }

  // Admin toggle active
  public async toggleStatus(req: Request, res: Response): Promise<void> {
    const { couponId } = req.params;
    const adminId = req.user?.userId;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const coupon = await couponService.toggleStatus(couponId!, adminId, context);
    sendSuccess(res, coupon, `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully.`);
  }

  // Admin delete
  public async deleteCoupon(req: Request, res: Response): Promise<void> {
    const { couponId } = req.params;
    const adminId = req.user?.userId;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    await couponService.deleteCoupon(couponId!, adminId, context);
    sendSuccess(res, null, 'Coupon deleted successfully.');
  }
}

export const couponController = new CouponController();
