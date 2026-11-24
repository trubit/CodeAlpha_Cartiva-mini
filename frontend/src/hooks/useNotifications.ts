import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service.js';
import type {
  NotificationQueryDto,
  UpdateNotificationPreferenceDto,
  AdminNotificationQueryDto,
} from '@shared/api.types.js';

export const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  list: (query?: NotificationQueryDto) => [...NOTIFICATION_KEYS.all, 'list', query] as const,
  unreadCount: () => [...NOTIFICATION_KEYS.all, 'unread-count'] as const,
  preferences: () => [...NOTIFICATION_KEYS.all, 'preferences'] as const,
  adminList: (query?: AdminNotificationQueryDto) =>
    [...NOTIFICATION_KEYS.all, 'admin-list', query] as const,
  adminDetails: (id: string) => [...NOTIFICATION_KEYS.all, 'admin-detail', id] as const,
  adminFailed: () => [...NOTIFICATION_KEYS.all, 'admin-failed'] as const,
  adminTemplates: () => [...NOTIFICATION_KEYS.all, 'admin-templates'] as const,
};

/**
 * Hook to retrieve paginated customer in-app notifications.
 */
export const useNotifications = (query?: NotificationQueryDto, enabled: boolean = true) => {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(query),
    queryFn: () => notificationService.getNotifications(query),
    enabled,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to poll for unread notification count.
 */
export const useUnreadNotificationCount = (enabled: boolean = true) => {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.unreadCount(),
    queryFn: () => notificationService.getUnreadCount(),
    enabled,
    refetchInterval: 30000, // Background poll every 30s
    staleTime: 10000,
  });
};

/**
 * Mutation to mark a single notification as read.
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
};

/**
 * Mutation to mark all notifications as read.
 */
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
};

/**
 * Mutation to delete an in-app notification.
 */
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
};

/**
 * Hook to retrieve customer communication preferences.
 */
export const useNotificationPreferences = (enabled: boolean = true) => {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.preferences(),
    queryFn: () => notificationService.getPreferences(),
    enabled,
  });
};

/**
 * Mutation to update customer communication preferences.
 */
export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateNotificationPreferenceDto) =>
      notificationService.updatePreferences(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.preferences() });
    },
  });
};

// ============================================================================
// Administrator Notification Hooks
// ============================================================================

export const useAdminNotifications = (
  query?: AdminNotificationQueryDto,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.adminList(query),
    queryFn: () => notificationService.getAdminOutboxNotifications(query),
    enabled,
    staleTime: 1000 * 15,
  });
};

export const useAdminNotificationDetails = (notificationId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.adminDetails(notificationId),
    queryFn: () => notificationService.getAdminNotificationDetails(notificationId),
    enabled: Boolean(notificationId) && enabled,
  });
};

export const useAdminRetryNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.retryAdminNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
};

export const useAdminFailedNotifications = (enabled: boolean = true) => {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.adminFailed(),
    queryFn: () => notificationService.getAdminFailedNotifications(),
    enabled,
    staleTime: 1000 * 30,
  });
};

export const useAdminNotificationTemplates = (enabled: boolean = true) => {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.adminTemplates(),
    queryFn: () => notificationService.getAdminTemplates(),
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
