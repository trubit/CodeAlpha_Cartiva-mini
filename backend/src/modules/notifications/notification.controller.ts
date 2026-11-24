import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess } from '../../utils/response.util.js';
import { AppError } from '../../utils/AppError.js';
import { notificationService } from './notification.service.js';
import { notificationPreferenceService } from './notification-preference.service.js';
import {
  notificationQuerySchema,
  updateNotificationPreferenceSchema,
  notificationIdParamSchema,
} from './notification.validators.js';

export class NotificationController {
  /**
   * GET /api/v1/notifications
   * Returns paginated in-app notifications for authenticated user.
   */
  public getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user?.id || req.user?.userId)!;
    const query = notificationQuerySchema.parse(req.query);

    const result = await notificationService.getCustomerNotifications(userId, query);
    return sendSuccess(res, result.items, 'Notifications retrieved successfully.', 200, result.meta);
  });

  /**
   * GET /api/v1/notifications/unread-count
   * Returns current unread in-app notification count.
   */
  public getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user?.id || req.user?.userId)!;
    const unreadCount = await notificationService.getUnreadCount(userId);
    return sendSuccess(res, { unreadCount }, 'Unread notification count retrieved.');
  });

  /**
   * PATCH /api/v1/notifications/:notificationId/read
   * Marks single notification as read.
   */
  public markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user?.id || req.user?.userId)!;
    const { notificationId } = notificationIdParamSchema.parse(req.params);

    const updated = await notificationService.markAsRead(userId, notificationId);
    if (!updated) {
      throw AppError.notFound('Notification not found or access denied.');
    }

    return sendSuccess(res, updated, 'Notification marked as read.');
  });

  /**
   * PATCH /api/v1/notifications/read-all
   * Marks all unread notifications as read.
   */
  public markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user?.id || req.user?.userId)!;
    const count = await notificationService.markAllAsRead(userId);
    return sendSuccess(res, { modifiedCount: count }, 'All notifications marked as read.');
  });

  /**
   * DELETE /api/v1/notifications/:notificationId
   * Deletes a notification with customer ownership verification.
   */
  public deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user?.id || req.user?.userId)!;
    const { notificationId } = notificationIdParamSchema.parse(req.params);

    const deleted = await notificationService.deleteNotification(userId, notificationId);
    if (!deleted) {
      throw AppError.notFound('Notification not found or access denied.');
    }

    return sendSuccess(res, { deleted: true }, 'Notification deleted successfully.');
  });

  /**
   * GET /api/v1/notifications/preferences
   * Returns customer communication preferences.
   */
  public getPreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user?.id || req.user?.userId)!;
    const prefs = await notificationPreferenceService.getPreferences(userId);
    return sendSuccess(res, prefs, 'Notification preferences retrieved.');
  });

  /**
   * PATCH /api/v1/notifications/preferences
   * Updates customer communication preferences.
   */
  public updatePreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user?.id || req.user?.userId)!;
    const updates = updateNotificationPreferenceSchema.parse(req.body);

    const prefs = await notificationPreferenceService.updatePreferences(userId, updates);
    return sendSuccess(res, prefs, 'Notification preferences updated successfully.');
  });
}

export const notificationController = new NotificationController();
