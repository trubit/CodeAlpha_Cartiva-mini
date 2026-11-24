import { Router } from 'express';
import { notificationController } from './notification.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export const notificationRouter = Router();

// All customer notification routes require authentication
notificationRouter.use(authenticate);

notificationRouter.get('/', notificationController.getNotifications);
notificationRouter.get('/unread-count', notificationController.getUnreadCount);
notificationRouter.get('/preferences', notificationController.getPreferences);
notificationRouter.patch('/preferences', notificationController.updatePreferences);
notificationRouter.patch('/read-all', notificationController.markAllAsRead);
notificationRouter.patch('/:notificationId/read', notificationController.markAsRead);
notificationRouter.delete('/:notificationId', notificationController.deleteNotification);
