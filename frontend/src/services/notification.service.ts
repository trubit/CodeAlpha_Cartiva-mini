import { apiClient } from './api.js';
import type {
  ApiResponse,
  NotificationDto,
  UnreadNotificationCountDto,
  NotificationQueryDto,
  NotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  AdminNotificationOutboxDto,
  AdminNotificationQueryDto,
  AdminNotificationRetryResponseDto,
  NotificationTemplateDto,
  PaginationMeta,
} from '@shared/api.types.js';

export interface PaginatedNotificationsResponse {
  items: NotificationDto[];
  meta: PaginationMeta;
}

export interface PaginatedAdminNotificationsResponse {
  items: AdminNotificationOutboxDto[];
  meta: PaginationMeta;
}

export const notificationService = {
  // Customer in-app operations
  async getNotifications(params?: NotificationQueryDto): Promise<PaginatedNotificationsResponse> {
    const response = await apiClient.get<ApiResponse<NotificationDto[]>>('/notifications', {
      params,
    });
    return {
      items: response.data.data,
      meta: response.data.meta || {
        page: 1,
        limit: 20,
        total: response.data.data.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<ApiResponse<UnreadNotificationCountDto>>(
      '/notifications/unread-count'
    );
    return response.data.data.unreadCount;
  },

  async markAsRead(notificationId: string): Promise<NotificationDto> {
    const response = await apiClient.patch<ApiResponse<NotificationDto>>(
      `/notifications/${notificationId}/read`
    );
    return response.data.data;
  },

  async markAllAsRead(): Promise<number> {
    const response = await apiClient.patch<ApiResponse<{ modifiedCount: number }>>(
      '/notifications/read-all'
    );
    return response.data.data.modifiedCount;
  },

  async deleteNotification(notificationId: string): Promise<boolean> {
    const response = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `/notifications/${notificationId}`
    );
    return response.data.data.deleted;
  },

  async getPreferences(): Promise<NotificationPreferenceDto> {
    const response = await apiClient.get<ApiResponse<NotificationPreferenceDto>>(
      '/notifications/preferences'
    );
    return response.data.data;
  },

  async updatePreferences(
    dto: UpdateNotificationPreferenceDto
  ): Promise<NotificationPreferenceDto> {
    const response = await apiClient.patch<ApiResponse<NotificationPreferenceDto>>(
      '/notifications/preferences',
      dto
    );
    return response.data.data;
  },

  // Admin outbox monitoring operations
  async getAdminOutboxNotifications(
    params?: AdminNotificationQueryDto
  ): Promise<PaginatedAdminNotificationsResponse> {
    const response = await apiClient.get<ApiResponse<AdminNotificationOutboxDto[]>>(
      '/admin/notifications',
      { params }
    );
    return {
      items: response.data.data,
      meta: response.data.meta || {
        page: 1,
        limit: 20,
        total: response.data.data.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  async getAdminNotificationDetails(
    notificationId: string
  ): Promise<{ outbox: AdminNotificationOutboxDto; deliveryLogs: unknown[] }> {
    const response = await apiClient.get<
      ApiResponse<{ outbox: AdminNotificationOutboxDto; deliveryLogs: unknown[] }>
    >(`/admin/notifications/${notificationId}`);
    return response.data.data;
  },

  async retryAdminNotification(
    notificationId: string
  ): Promise<AdminNotificationRetryResponseDto> {
    const response = await apiClient.post<ApiResponse<AdminNotificationRetryResponseDto>>(
      `/admin/notifications/${notificationId}/retry`
    );
    return response.data.data;
  },

  async getAdminFailedNotifications(): Promise<AdminNotificationOutboxDto[]> {
    const response = await apiClient.get<ApiResponse<AdminNotificationOutboxDto[]>>(
      '/admin/notifications/failed'
    );
    return response.data.data;
  },

  async getAdminTemplates(): Promise<NotificationTemplateDto[]> {
    const response = await apiClient.get<ApiResponse<NotificationTemplateDto[]>>(
      '/admin/notifications/templates'
    );
    return response.data.data;
  },
};
