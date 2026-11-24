/**
 * Cartiva Mini — Audit Log Frontend Service
 * Phase 15: Admin Dashboard & Centralized Management System
 */
import { apiClient } from './api.js';
import type {
  ApiResponse,
  AuditFilterDto,
  AuditLogItemDto,
  PaginatedAuditLogsDto,
} from '@shared/api.types.js';

export const auditService = {
  async listLogs(params?: AuditFilterDto): Promise<PaginatedAuditLogsDto> {
    const response = await apiClient.get<
      ApiResponse<PaginatedAuditLogsDto | AuditLogItemDto[]>
    >('/admin/audit-logs', {
      params,
    });

    const resData = response.data?.data;
    const meta = response.data?.meta;

    // Case 1: Legacy shape { data: { logs: [...], pagination: {...} } }
    if (resData && typeof resData === 'object' && !Array.isArray(resData) && Array.isArray(resData.logs)) {
      return {
        logs: resData.logs,
        pagination: resData.pagination || meta || {
          page: 1,
          limit: 20,
          total: resData.logs.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    // Case 2: Standard shape ApiResponse<AuditLogItemDto[]> with meta
    if (Array.isArray(resData)) {
      return {
        logs: resData,
        pagination: meta || {
          page: 1,
          limit: 20,
          total: resData.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    // Case 3: Empty fallback
    return {
      logs: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },
};
