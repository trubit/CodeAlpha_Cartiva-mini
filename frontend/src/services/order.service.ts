/**
 * Cartiva Mini — Order Frontend Service
 * Client for customer order history, details, cancellation, and administrative order management.
 */
import { apiClient } from './api';
import type {
  ApiResponse,
  OrderDetailDto,
  OrderListItemDto,
  OrderAdminFilterDto,
  UpdateOrderStatusDto,
  OrderAuditEntryDto,
} from '@shared/api.types';

export const orderService = {
  /**
   * Retrieves customer order history.
   */
  async getMyOrders(page = 1, limit = 10): Promise<ApiResponse<OrderListItemDto[]>> {
    const response = await apiClient.get<ApiResponse<OrderListItemDto[]>>('/orders', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Retrieves customer order detail by ID or order number.
   */
  async getOrderDetail(identifier: string): Promise<ApiResponse<OrderDetailDto>> {
    const response = await apiClient.get<ApiResponse<OrderDetailDto>>(`/orders/${identifier}`);
    return response.data;
  },

  /**
   * Cancels eligible customer order and releases reserved inventory.
   */
  async cancelOrder(identifier: string, reason?: string): Promise<ApiResponse<OrderDetailDto>> {
    const response = await apiClient.post<ApiResponse<OrderDetailDto>>(
      `/orders/${identifier}/cancel`,
      {
        reason,
      }
    );
    return response.data;
  },

  /**
   * Admin: List orders with search and filtering.
   */
  async getAdminOrders(filter: OrderAdminFilterDto = {}): Promise<ApiResponse<OrderDetailDto[]>> {
    const response = await apiClient.get<ApiResponse<OrderDetailDto[]>>('/admin/orders', {
      params: filter,
    });
    return response.data;
  },

  /**
   * Admin: Retrieve order detail.
   */
  async getAdminOrderDetail(identifier: string): Promise<ApiResponse<OrderDetailDto>> {
    const response = await apiClient.get<ApiResponse<OrderDetailDto>>(
      `/admin/orders/${identifier}`
    );
    return response.data;
  },

  /**
   * Admin: Update order status.
   */
  async updateAdminOrderStatus(
    identifier: string,
    data: UpdateOrderStatusDto
  ): Promise<ApiResponse<OrderDetailDto>> {
    const response = await apiClient.patch<ApiResponse<OrderDetailDto>>(
      `/admin/orders/${identifier}/status`,
      data
    );
    return response.data;
  },

  /**
   * Admin: Retrieve order audit history.
   */
  async getAdminOrderAudit(identifier: string): Promise<ApiResponse<OrderAuditEntryDto[]>> {
    const response = await apiClient.get<ApiResponse<OrderAuditEntryDto[]>>(
      `/admin/orders/${identifier}/audit`
    );
    return response.data;
  },
};
