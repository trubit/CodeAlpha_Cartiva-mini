/**
 * Cartiva Mini — Coupon & Discount Frontend Service
 * Phase 15: Admin Dashboard & Centralized Management System
 */
import { apiClient } from './api.js';
import type {
  ApiResponse,
  CouponDto,
  CreateCouponDto,
  UpdateCouponDto,
  PaginatedCouponsDto,
  CouponValidationResultDto,
} from '@shared/api.types.js';

export const couponService = {
  // Public customer validation
  async validateCoupon(code: string, subtotal: number): Promise<CouponValidationResultDto> {
    const response = await apiClient.post<ApiResponse<CouponValidationResultDto>>(
      '/coupons/validate',
      { code, subtotal }
    );
    return response.data.data;
  },

  // Admin coupon management
  async listCoupons(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<PaginatedCouponsDto> {
    const response = await apiClient.get<ApiResponse<CouponDto[]>>('/admin/coupons', { params });
    return {
      coupons: response.data.data,
      pagination: response.data.meta!,
    };
  },

  async getCoupon(couponId: string): Promise<CouponDto> {
    const response = await apiClient.get<ApiResponse<CouponDto>>(`/admin/coupons/${couponId}`);
    return response.data.data;
  },

  async createCoupon(dto: CreateCouponDto): Promise<CouponDto> {
    const response = await apiClient.post<ApiResponse<CouponDto>>('/admin/coupons', dto);
    return response.data.data;
  },

  async updateCoupon(couponId: string, dto: UpdateCouponDto): Promise<CouponDto> {
    const response = await apiClient.patch<ApiResponse<CouponDto>>(
      `/admin/coupons/${couponId}`,
      dto
    );
    return response.data.data;
  },

  async toggleCouponStatus(couponId: string): Promise<CouponDto> {
    const response = await apiClient.patch<ApiResponse<CouponDto>>(
      `/admin/coupons/${couponId}/status`
    );
    return response.data.data;
  },

  async deleteCoupon(couponId: string): Promise<void> {
    await apiClient.delete(`/admin/coupons/${couponId}`);
  },
};
