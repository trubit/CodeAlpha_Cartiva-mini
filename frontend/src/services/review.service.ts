/**
 * Cartiva Mini — Review Frontend Service
 * Phase 15: Admin Dashboard & Centralized Management System
 */
import { apiClient } from './api.js';
import type {
  ApiResponse,
  ReviewDto,
  CreateReviewDto,
  UpdateReviewStatusDto,
  ReviewFilterDto,
  PaginatedReviewsDto,
} from '@shared/api.types.js';

export const reviewService = {
  // Public product reviews
  async getProductReviews(productId: string): Promise<ReviewDto[]> {
    const response = await apiClient.get<ApiResponse<ReviewDto[]>>(`/reviews/products/${productId}`);
    return response.data.data;
  },

  // Customer submit review
  async createReview(productId: string, dto: CreateReviewDto): Promise<ReviewDto> {
    const response = await apiClient.post<ApiResponse<ReviewDto>>(
      `/reviews/products/${productId}`,
      dto
    );
    return response.data.data;
  },

  // Admin list reviews
  async listReviews(params?: ReviewFilterDto): Promise<PaginatedReviewsDto> {
    const response = await apiClient.get<ApiResponse<ReviewDto[]>>('/admin/reviews', { params });
    return {
      reviews: response.data.data,
      pagination: response.data.meta!,
    };
  },

  // Admin moderate status
  async updateReviewStatus(reviewId: string, dto: UpdateReviewStatusDto): Promise<ReviewDto> {
    const response = await apiClient.patch<ApiResponse<ReviewDto>>(
      `/admin/reviews/${reviewId}/status`,
      dto
    );
    return response.data.data;
  },

  // Admin delete review
  async deleteReview(reviewId: string): Promise<void> {
    await apiClient.delete(`/admin/reviews/${reviewId}`);
  },
};
