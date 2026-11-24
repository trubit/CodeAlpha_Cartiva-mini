import { apiClient } from './api.js';
import type {
  ApiResponse,
  InventoryItemDto,
  InventorySummaryDto,
  InventoryMovementDto,
  InventoryReservationDto,
  InitializeInventoryDto,
  ReceiveStockDto,
  DeductStockDto,
  AdjustStockDto,
  UpdateThresholdDto,
  CreateReservationDto,
  PaginatedInventoryDto,
  PaginatedMovementsDto,
} from '@shared/api.types.js';

export const inventoryService = {
  // Admin Inventory Overview
  async getInventoryList(params?: Record<string, unknown>): Promise<PaginatedInventoryDto> {
    const response = await apiClient.get<ApiResponse<InventoryItemDto[]>>('/admin/inventory', {
      params,
    });
    return {
      items: response.data.data,
      pagination: response.data.meta!,
    };
  },

  async getInventorySummary(): Promise<InventorySummaryDto> {
    const response = await apiClient.get<ApiResponse<InventorySummaryDto>>(
      '/admin/inventory/summary'
    );
    return response.data.data;
  },

  async getLowStockItems(params?: Record<string, unknown>): Promise<PaginatedInventoryDto> {
    const response = await apiClient.get<ApiResponse<InventoryItemDto[]>>(
      '/admin/inventory/low-stock',
      {
        params,
      }
    );
    return {
      items: response.data.data,
      pagination: response.data.meta!,
    };
  },

  async getOutOfStockItems(params?: Record<string, unknown>): Promise<PaginatedInventoryDto> {
    const response = await apiClient.get<ApiResponse<InventoryItemDto[]>>(
      '/admin/inventory/out-of-stock',
      {
        params,
      }
    );
    return {
      items: response.data.data,
      pagination: response.data.meta!,
    };
  },

  async getInventoryDetail(inventoryId: string, variantId?: string): Promise<InventoryItemDto> {
    const response = await apiClient.get<ApiResponse<InventoryItemDto>>(
      `/admin/inventory/${inventoryId}`,
      {
        params: variantId ? { variantId } : undefined,
      }
    );
    return response.data.data;
  },

  async getMovements(params?: Record<string, unknown>): Promise<PaginatedMovementsDto> {
    const response = await apiClient.get<ApiResponse<InventoryMovementDto[]>>(
      '/admin/inventory/movements',
      {
        params,
      }
    );
    return {
      movements: response.data.data,
      pagination: response.data.meta!,
    };
  },

  async getTargetMovements(
    inventoryId: string,
    params?: Record<string, unknown>
  ): Promise<PaginatedMovementsDto> {
    const response = await apiClient.get<ApiResponse<InventoryMovementDto[]>>(
      `/admin/inventory/${inventoryId}/movements`,
      { params }
    );
    return {
      movements: response.data.data,
      pagination: response.data.meta!,
    };
  },

  // Stock Operations
  async initializeStock(
    inventoryId: string,
    data: InitializeInventoryDto,
    variantId?: string
  ): Promise<InventoryItemDto> {
    const response = await apiClient.post<ApiResponse<InventoryItemDto>>(
      `/admin/inventory/${inventoryId}/initialize`,
      data,
      { params: variantId ? { variantId } : undefined }
    );
    return response.data.data;
  },

  async receiveStock(
    inventoryId: string,
    data: ReceiveStockDto,
    variantId?: string
  ): Promise<InventoryItemDto> {
    const response = await apiClient.post<ApiResponse<InventoryItemDto>>(
      `/admin/inventory/${inventoryId}/receive`,
      data,
      { params: variantId ? { variantId } : undefined }
    );
    return response.data.data;
  },

  async adjustStock(
    inventoryId: string,
    data: AdjustStockDto,
    variantId?: string
  ): Promise<InventoryItemDto> {
    const response = await apiClient.post<ApiResponse<InventoryItemDto>>(
      `/admin/inventory/${inventoryId}/adjust`,
      data,
      { params: variantId ? { variantId } : undefined }
    );
    return response.data.data;
  },

  async deductStock(
    inventoryId: string,
    data: DeductStockDto,
    variantId?: string
  ): Promise<InventoryItemDto> {
    const response = await apiClient.post<ApiResponse<InventoryItemDto>>(
      `/admin/inventory/${inventoryId}/deduct`,
      data,
      { params: variantId ? { variantId } : undefined }
    );
    return response.data.data;
  },

  async updateThreshold(
    inventoryId: string,
    data: UpdateThresholdDto,
    variantId?: string
  ): Promise<InventoryItemDto> {
    const response = await apiClient.patch<ApiResponse<InventoryItemDto>>(
      `/admin/inventory/${inventoryId}/threshold`,
      data,
      { params: variantId ? { variantId } : undefined }
    );
    return response.data.data;
  },

  // Reservations
  async createReservation(data: CreateReservationDto): Promise<InventoryReservationDto> {
    const response = await apiClient.post<ApiResponse<InventoryReservationDto>>(
      '/inventory/reservations',
      data
    );
    return response.data.data;
  },

  async getReservation(reservationId: string): Promise<InventoryReservationDto> {
    const response = await apiClient.get<ApiResponse<InventoryReservationDto>>(
      `/inventory/reservations/${reservationId}`
    );
    return response.data.data;
  },

  async releaseReservation(reservationId: string): Promise<InventoryReservationDto> {
    const response = await apiClient.post<ApiResponse<InventoryReservationDto>>(
      `/inventory/reservations/${reservationId}/release`
    );
    return response.data.data;
  },
};
