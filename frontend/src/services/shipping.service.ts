import { apiClient } from './api.js';
import type {
  ApiResponse,
  ShippingMethodDto,
  ShippingAvailabilityDto,
  ShippingQuoteRequestDto,
  ShippingQuoteResponseDto,
  CreateShippingConfigDto,
  UpdateShippingConfigDto,
  ShippingConfigFilterDto,
} from '@shared/api.types.js';

export const shippingService = {
  /**
   * Fetches available shipping methods for a specific location.
   */
  async getShippingMethods(country = 'Nigeria', state: string): Promise<ShippingMethodDto[]> {
    const res = await apiClient.get<ApiResponse<ShippingMethodDto[]>>('/shipping/methods', {
      params: { country, state },
    });
    return res.data.data;
  },

  /**
   * Checks whether delivery service is available to the given country and state.
   */
  async checkAvailability(country = 'Nigeria', state: string): Promise<ShippingAvailabilityDto> {
    const res = await apiClient.get<ApiResponse<ShippingAvailabilityDto>>(
      '/shipping/availability',
      {
        params: { country, state },
      }
    );
    return res.data.data;
  },

  /**
   * Calculates the authoritative shipping quotes based on cart and address/destination.
   */
  async calculateQuote(dto: ShippingQuoteRequestDto): Promise<ShippingQuoteResponseDto> {
    const res = await apiClient.post<ApiResponse<ShippingQuoteResponseDto>>(
      '/shipping/quotes',
      dto
    );
    return res.data.data;
  },

  // ============================================================================
  // Administrator Operations
  // ============================================================================

  /**
   * Lists all shipping configurations with optional filters (Admin only).
   */
  async getAdminConfigurations(filters?: ShippingConfigFilterDto): Promise<ShippingMethodDto[]> {
    const res = await apiClient.get<ApiResponse<ShippingMethodDto[]>>(
      '/admin/shipping/configurations',
      { params: filters }
    );
    return res.data.data;
  },

  /**
   * Retrieves a single shipping configuration by ID (Admin only).
   */
  async getAdminConfigurationById(id: string): Promise<ShippingMethodDto> {
    const res = await apiClient.get<ApiResponse<ShippingMethodDto>>(
      `/admin/shipping/configurations/${id}`
    );
    return res.data.data;
  },

  /**
   * Creates a new shipping configuration (Admin only).
   */
  async createAdminConfiguration(dto: CreateShippingConfigDto): Promise<ShippingMethodDto> {
    const res = await apiClient.post<ApiResponse<ShippingMethodDto>>(
      '/admin/shipping/configurations',
      dto
    );
    return res.data.data;
  },

  /**
   * Updates an existing shipping configuration (Admin only).
   */
  async updateAdminConfiguration(
    id: string,
    dto: UpdateShippingConfigDto
  ): Promise<ShippingMethodDto> {
    const res = await apiClient.patch<ApiResponse<ShippingMethodDto>>(
      `/admin/shipping/configurations/${id}`,
      dto
    );
    return res.data.data;
  },

  /**
   * Toggles active status of a shipping configuration (Admin only).
   */
  async toggleAdminConfigurationStatus(id: string, isActive: boolean): Promise<ShippingMethodDto> {
    const res = await apiClient.patch<ApiResponse<ShippingMethodDto>>(
      `/admin/shipping/configurations/${id}/status`,
      { isActive }
    );
    return res.data.data;
  },

  /**
   * Deletes a shipping configuration (Admin only).
   */
  async deleteAdminConfiguration(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/admin/shipping/configurations/${id}`);
  },
};
