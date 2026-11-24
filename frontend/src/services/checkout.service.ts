/**
 * Cartiva Mini — Checkout Frontend Service
 * Client for server-side checkout session management, address/shipping selection, and order confirmation.
 */
import { apiClient } from './api';
import type {
  ApiResponse,
  CheckoutSessionDto,
  CheckoutSummaryDto,
  CheckoutValidateResponseDto,
  CheckoutConfirmRequestDto,
  CheckoutConfirmResponseDto,
} from '@shared/api.types';

export const checkoutService = {
  /**
   * Retrieves or initializes active checkout session.
   */
  async getSession(): Promise<ApiResponse<CheckoutSessionDto>> {
    const response = await apiClient.get<ApiResponse<CheckoutSessionDto>>('/checkout/session');
    return response.data;
  },

  /**
   * Selects delivery destination address for the session.
   */
  async setAddress(addressId: string): Promise<ApiResponse<CheckoutSessionDto>> {
    const response = await apiClient.patch<ApiResponse<CheckoutSessionDto>>(
      '/checkout/session/address',
      {
        addressId,
      }
    );
    return response.data;
  },

  /**
   * Selects shipping method and authoritatively computes shipping fee.
   */
  async setShipping(shippingMethodId: string): Promise<ApiResponse<CheckoutSessionDto>> {
    const response = await apiClient.patch<ApiResponse<CheckoutSessionDto>>(
      '/checkout/session/shipping',
      {
        shippingMethodId,
      }
    );
    return response.data;
  },

  /**
   * Retrieves comprehensive server-side checkout summary.
   */
  async getSummary(): Promise<ApiResponse<CheckoutSummaryDto>> {
    const response = await apiClient.get<ApiResponse<CheckoutSummaryDto>>(
      '/checkout/session/summary'
    );
    return response.data;
  },

  /**
   * Pre-flight validation check.
   */
  async validateCheckout(): Promise<ApiResponse<CheckoutValidateResponseDto>> {
    const response =
      await apiClient.post<ApiResponse<CheckoutValidateResponseDto>>('/checkout/validate');
    return response.data;
  },

  /**
   * Confirms order and triggers atomic stock reservation.
   */
  async confirmOrder(
    data: CheckoutConfirmRequestDto
  ): Promise<ApiResponse<CheckoutConfirmResponseDto>> {
    const response = await apiClient.post<ApiResponse<CheckoutConfirmResponseDto>>(
      '/checkout/confirm',
      data
    );
    return response.data;
  },
};
