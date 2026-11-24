/**
 * Cartiva Mini — Platform Settings Frontend Service
 * Phase 15: Admin Dashboard & Centralized Management System
 */
import { apiClient } from './api.js';
import type {
  ApiResponse,
  PlatformSettingsDto,
  UpdatePlatformSettingsDto,
} from '@shared/api.types.js';

export const settingsService = {
  // Public storefront settings
  async getPublicSettings(): Promise<Partial<PlatformSettingsDto>> {
    const response = await apiClient.get<ApiResponse<Partial<PlatformSettingsDto>>>('/settings');
    return response.data.data;
  },

  // Admin platform settings
  async getAdminSettings(): Promise<PlatformSettingsDto> {
    const response = await apiClient.get<ApiResponse<PlatformSettingsDto>>('/admin/settings');
    return response.data.data;
  },

  async updateSettings(dto: UpdatePlatformSettingsDto): Promise<PlatformSettingsDto> {
    const response = await apiClient.patch<ApiResponse<PlatformSettingsDto>>(
      '/admin/settings',
      dto
    );
    return response.data.data;
  },
};
