import { z } from 'zod';
import {
  NotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@shared/enums.js';

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  type: z.nativeEnum(NotificationType).optional(),
});

export const updateNotificationPreferenceSchema = z.object({
  promotionalEmails: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  inAppAlerts: z.boolean().optional(),
  smsAlerts: z.boolean().optional(),
  pushAlerts: z.boolean().optional(),
});

export const adminNotificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(NotificationDeliveryStatus).optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
  eventType: z.nativeEnum(NotificationType).optional(),
  search: z.string().trim().optional(),
});

export const notificationIdParamSchema = z.object({
  notificationId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Notification ID format.'),
});
