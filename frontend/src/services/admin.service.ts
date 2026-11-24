/**
 * Cartiva Mini — Admin Service
 * Phase 15: Admin Dashboard & Centralized Management System
 */
import { apiClient } from './api.js';
import type {
  ApiResponse,
  DashboardSummaryDto,
  DashboardChartsDto,
  DashboardFilterDto,
  SalesReportDto,
  ReportFilterDto,
  AdminStaffItemDto,
  CreateStaffDto,
  UpdateStaffRoleDto,
  SafeUser,
} from '@shared/api.types.js';

export const adminService = {
  // Dashboard Metrics
  async getDashboardSummary(params?: DashboardFilterDto): Promise<DashboardSummaryDto> {
    const response = await apiClient.get<ApiResponse<DashboardSummaryDto>>('/admin/dashboard/summary', {
      params,
    });
    return response.data.data;
  },

  async getDashboardCharts(params?: DashboardFilterDto): Promise<DashboardChartsDto> {
    const response = await apiClient.get<ApiResponse<DashboardChartsDto>>('/admin/dashboard/charts', {
      params,
    });
    return response.data.data;
  },

  // Financial Reports
  async getSalesReport(params?: ReportFilterDto): Promise<SalesReportDto> {
    const response = await apiClient.get<ApiResponse<SalesReportDto>>('/admin/reports/sales', {
      params,
    });
    return response.data.data;
  },

  async exportOrdersCsv(params?: ReportFilterDto): Promise<Blob> {
    const response = await apiClient.get('/admin/reports/export/orders', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  async exportProductsCsv(): Promise<Blob> {
    const response = await apiClient.get('/admin/reports/export/products', {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  // Staff and Permissions Management
  async listStaff(): Promise<AdminStaffItemDto[]> {
    const response = await apiClient.get<ApiResponse<AdminStaffItemDto[]>>('/admin/users/staff');
    return response.data.data;
  },

  async createStaff(dto: CreateStaffDto): Promise<SafeUser> {
    const response = await apiClient.post<ApiResponse<SafeUser>>('/admin/users/staff', dto);
    return response.data.data;
  },

  async updateStaffRole(userId: string, dto: UpdateStaffRoleDto): Promise<SafeUser> {
    const response = await apiClient.patch<ApiResponse<SafeUser>>(`/admin/users/${userId}/role`, dto);
    return response.data.data;
  },

  async reviewDeletionRequest(
    userId: string,
    dto: { deletionStatus: 'approved' | 'rejected'; reason?: string }
  ): Promise<SafeUser> {
    const response = await apiClient.patch<ApiResponse<SafeUser>>(
      `/admin/users/${userId}/deletion-request`,
      dto
    );
    return response.data.data;
  },
};
