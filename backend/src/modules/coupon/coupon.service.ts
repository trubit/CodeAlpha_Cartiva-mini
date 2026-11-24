/**
 * Cartiva Mini — Coupon & Promotion Management Service
 * Phase 15: Admin Dashboard & Centralized Management System
 */
import { Types } from 'mongoose';
import { Coupon, AuditLog, type CouponDocument } from '../../models/index.js';
import { AppError } from '../../utils/AppError.js';
import { HttpStatus } from '../../constants/httpStatusCodes.js';
import { DiscountType } from '@shared/enums.js';
import type {
  CouponDto,
  CreateCouponDto,
  UpdateCouponDto,
  PaginatedCouponsDto,
  CouponValidationResultDto,
} from '@shared/api.types.js';

export class CouponService {
  private mapToDto(coupon: CouponDocument): CouponDto {
    return {
      id: coupon._id.toString(),
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType as DiscountType,
      discountValue: coupon.discountValue,
      minOrderValue: coupon.minOrderValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      startDate: coupon.startDate.toISOString(),
      expiryDate: coupon.expiryDate.toISOString(),
      usageLimitTotal: coupon.usageLimitTotal,
      usageLimitPerUser: coupon.usageLimitPerUser,
      usedCount: coupon.usedCount,
      applicableCategories: coupon.applicableCategories?.map((c) => c.toString()),
      applicableProducts: coupon.applicableProducts?.map((p) => p.toString()),
      isActive: coupon.isActive,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    };
  }

  public async listCoupons(query: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<PaginatedCouponsDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.search) {
      filter.$or = [
        { code: { $regex: query.search.trim(), $options: 'i' } },
        { description: { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    const [coupons, total] = await Promise.all([
      Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Coupon.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      coupons: coupons.map((c) => this.mapToDto(c)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  public async getCouponById(couponId: string): Promise<CouponDto> {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw new AppError('Coupon not found.', HttpStatus.NOT_FOUND, 'COUPON_NOT_FOUND');
    }
    return this.mapToDto(coupon);
  }

  public async createCoupon(
    dto: CreateCouponDto,
    actorId?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<CouponDto> {
    const existing = await Coupon.findOne({ code: dto.code.toUpperCase().trim() });
    if (existing) {
      throw new AppError(
        `Coupon with code '${dto.code}' already exists.`,
        HttpStatus.CONFLICT,
        'COUPON_ALREADY_EXISTS'
      );
    }

    const coupon = await Coupon.create({
      code: dto.code.toUpperCase().trim(),
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minOrderValue: dto.minOrderValue || 0,
      maxDiscountAmount: dto.maxDiscountAmount,
      startDate: new Date(dto.startDate),
      expiryDate: new Date(dto.expiryDate),
      usageLimitTotal: dto.usageLimitTotal,
      usageLimitPerUser: dto.usageLimitPerUser || 1,
      applicableCategories: dto.applicableCategories?.map((id) => new Types.ObjectId(id)) || [],
      applicableProducts: dto.applicableProducts?.map((id) => new Types.ObjectId(id)) || [],
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    if (actorId) {
      await AuditLog.create({
        actorId: new Types.ObjectId(actorId),
        actorRole: 'admin',
        action: 'COUPON_CREATED',
        entity: 'Coupon',
        entityId: coupon._id.toString(),
        ipAddress: context?.ip,
        userAgent: context?.userAgent,
        changesDiff: { after: coupon.toObject() },
      });
    }

    return this.mapToDto(coupon);
  }

  public async updateCoupon(
    couponId: string,
    dto: UpdateCouponDto,
    actorId?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<CouponDto> {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw new AppError('Coupon not found.', HttpStatus.NOT_FOUND, 'COUPON_NOT_FOUND');
    }

    const previousState = coupon.toObject();

    if (dto.code && dto.code !== coupon.code) {
      const duplicate = await Coupon.findOne({ code: dto.code.toUpperCase().trim(), _id: { $ne: coupon._id } });
      if (duplicate) {
        throw new AppError(
          `Coupon code '${dto.code}' is already used by another coupon.`,
          HttpStatus.CONFLICT,
          'COUPON_CODE_IN_USE'
        );
      }
      coupon.code = dto.code.toUpperCase().trim();
    }

    if (dto.description !== undefined) coupon.description = dto.description;
    if (dto.discountType) coupon.discountType = dto.discountType;
    if (dto.discountValue !== undefined) coupon.discountValue = dto.discountValue;
    if (dto.minOrderValue !== undefined) coupon.minOrderValue = dto.minOrderValue;
    if (dto.maxDiscountAmount !== undefined) coupon.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.startDate) coupon.startDate = new Date(dto.startDate);
    if (dto.expiryDate) coupon.expiryDate = new Date(dto.expiryDate);
    if (dto.usageLimitTotal !== undefined) coupon.usageLimitTotal = dto.usageLimitTotal;
    if (dto.usageLimitPerUser !== undefined) coupon.usageLimitPerUser = dto.usageLimitPerUser;
    if (dto.isActive !== undefined) coupon.isActive = dto.isActive;

    await coupon.save();

    if (actorId) {
      await AuditLog.create({
        actorId: new Types.ObjectId(actorId),
        actorRole: 'admin',
        action: 'COUPON_UPDATED',
        entity: 'Coupon',
        entityId: coupon._id.toString(),
        ipAddress: context?.ip,
        userAgent: context?.userAgent,
        changesDiff: { before: previousState, after: coupon.toObject() },
      });
    }

    return this.mapToDto(coupon);
  }

  public async toggleStatus(
    couponId: string,
    actorId?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<CouponDto> {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw new AppError('Coupon not found.', HttpStatus.NOT_FOUND, 'COUPON_NOT_FOUND');
    }

    const prevActive = coupon.isActive;
    coupon.isActive = !coupon.isActive;
    await coupon.save();

    if (actorId) {
      await AuditLog.create({
        actorId: new Types.ObjectId(actorId),
        actorRole: 'admin',
        action: 'COUPON_STATUS_TOGGLED',
        entity: 'Coupon',
        entityId: coupon._id.toString(),
        ipAddress: context?.ip,
        userAgent: context?.userAgent,
        changesDiff: { before: { isActive: prevActive }, after: { isActive: coupon.isActive } },
      });
    }

    return this.mapToDto(coupon);
  }

  public async deleteCoupon(
    couponId: string,
    actorId?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw new AppError('Coupon not found.', HttpStatus.NOT_FOUND, 'COUPON_NOT_FOUND');
    }

    const deletedState = coupon.toObject();
    await Coupon.findByIdAndDelete(couponId);

    if (actorId) {
      await AuditLog.create({
        actorId: new Types.ObjectId(actorId),
        actorRole: 'admin',
        action: 'COUPON_DELETED',
        entity: 'Coupon',
        entityId: couponId,
        ipAddress: context?.ip,
        userAgent: context?.userAgent,
        changesDiff: { before: deletedState },
      });
    }
  }

  /**
   * Validates coupon eligibility and returns calculated discount amount.
   */
  public async validateCoupon(code: string, subtotal: number): Promise<CouponValidationResultDto> {
    const cleanCode = code.toUpperCase().trim();
    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon || !coupon.isActive) {
      return {
        valid: false,
        code: cleanCode,
        discountType: DiscountType.FIXED,
        discountValue: 0,
        discountAmount: 0,
        newSubtotal: subtotal,
        message: 'Invalid or inactive coupon code.',
      };
    }

    const now = new Date();
    if (now < coupon.startDate) {
      return {
        valid: false,
        code: cleanCode,
        discountType: coupon.discountType as DiscountType,
        discountValue: coupon.discountValue,
        discountAmount: 0,
        newSubtotal: subtotal,
        message: 'Coupon is not yet active.',
      };
    }

    if (now > coupon.expiryDate) {
      return {
        valid: false,
        code: cleanCode,
        discountType: coupon.discountType as DiscountType,
        discountValue: coupon.discountValue,
        discountAmount: 0,
        newSubtotal: subtotal,
        message: 'Coupon has expired.',
      };
    }

    if (coupon.usageLimitTotal && coupon.usedCount >= coupon.usageLimitTotal) {
      return {
        valid: false,
        code: cleanCode,
        discountType: coupon.discountType as DiscountType,
        discountValue: coupon.discountValue,
        discountAmount: 0,
        newSubtotal: subtotal,
        message: 'Coupon usage limit has been reached.',
      };
    }

    if (subtotal < coupon.minOrderValue) {
      return {
        valid: false,
        code: cleanCode,
        discountType: coupon.discountType as DiscountType,
        discountValue: coupon.discountValue,
        discountAmount: 0,
        newSubtotal: subtotal,
        message: `Order subtotal must be at least ₦${coupon.minOrderValue.toLocaleString()} to use this coupon.`,
      };
    }

    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = Math.min(coupon.discountValue, subtotal);
    }

    const newSubtotal = Math.max(0, subtotal - discountAmount);

    return {
      valid: true,
      code: cleanCode,
      discountType: coupon.discountType as DiscountType,
      discountValue: coupon.discountValue,
      discountAmount,
      newSubtotal,
      message: `Coupon '${cleanCode}' applied successfully! Saved ₦${discountAmount.toLocaleString()}.`,
    };
  }
}

export const couponService = new CouponService();
