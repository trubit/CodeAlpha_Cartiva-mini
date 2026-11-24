import { Router } from 'express';
import { adminNotificationController } from './admin-notification.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { UserRole } from '@shared/enums.js';

export const adminNotificationRouter = Router();

// Guarded by authentication and Admin/Staff role
adminNotificationRouter.use(authenticate, requireRole(UserRole.ADMIN, UserRole.STAFF));

adminNotificationRouter.get('/', adminNotificationController.getOutboxActivity);
adminNotificationRouter.get('/failed', adminNotificationController.getFailedNotifications);
adminNotificationRouter.get('/templates', adminNotificationController.getTemplates);
adminNotificationRouter.get('/:notificationId', adminNotificationController.getNotificationDetails);
adminNotificationRouter.post('/:notificationId/retry', adminNotificationController.retryNotification);
