import { Types } from 'mongoose';
import { Notification, type NotificationDocument } from '../../models/Notification.model.js';
import { User } from '../../models/User.model.js';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '@shared/enums.js';
import type {
  NotificationDto,
  NotificationQueryDto,
  PaginationMeta,
} from '@shared/api.types.js';
import { renderEmailTemplate, type TemplateContext } from './notification.templates.js';
import { notificationPreferenceService } from './notification-preference.service.js';
import { notificationOutboxService } from './notification-outbox.service.js';
import { logger } from '../../config/logger.js';

export interface DispatchNotificationEvent {
  eventType: NotificationType;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  title: string;
  message: string;
  actionUrl?: string;
  priority?: NotificationPriority;
  templateContext?: TemplateContext;
  channels?: NotificationChannel[];
  eventId?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  /**
   * Central entry point to dispatch notifications across in-app, email, and future channels.
   * Completely decoupled and resilient: errors here never disrupt primary business transactions.
   */
  public async notify(event: DispatchNotificationEvent): Promise<{ inAppId?: string; eventId: string }> {
    const eventId =
      event.eventId ||
      `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const channels = event.channels || [NotificationChannel.IN_APP, NotificationChannel.EMAIL];
    let createdInAppId: string | undefined;

    // 1. In-App Notification Delivery
    if (channels.includes(NotificationChannel.IN_APP) && event.recipientId) {
      try {
        const isPermitted = await notificationPreferenceService.isNotificationPermitted(
          event.recipientId,
          event.eventType,
          NotificationChannel.IN_APP
        );

        if (isPermitted) {
          const inAppDoc = await Notification.create({
            recipientId: new Types.ObjectId(event.recipientId),
            type: event.eventType,
            title: event.title,
            message: event.message,
            actionUrl: event.actionUrl,
            priority: event.priority || NotificationPriority.NORMAL,
            metadata: event.metadata || {},
            isRead: false,
          });
          createdInAppId = inAppDoc._id.toString();
        }
      } catch (err) {
        logger.error(
          { error: (err as Error).message, recipientId: event.recipientId },
          'Failed to persist in-app notification'
        );
      }
    }

    // 2. Transactional Email Delivery (via Persistent Outbox)
    if (channels.includes(NotificationChannel.EMAIL)) {
      try {
        let email = event.recipientEmail;
        let recipientName = event.recipientName;

        // If email not directly supplied but recipientId exists, fetch customer user record
        if (!email && event.recipientId) {
          const user = await User.findById(event.recipientId).select('email firstName lastName');
          if (user) {
            email = user.email;
            if (!recipientName) {
              recipientName = `${user.firstName} ${user.lastName}`.trim();
            }
          }
        }

        if (email) {
          const isPermitted = await notificationPreferenceService.isNotificationPermitted(
            event.recipientId,
            event.eventType,
            NotificationChannel.EMAIL
          );

          if (isPermitted) {
            const context: TemplateContext = {
              recipientName,
              actionUrl: event.actionUrl,
              message: event.message,
              ...event.templateContext,
            };

            const rendered = renderEmailTemplate(event.eventType, context);

            await notificationOutboxService.enqueueJob({
              eventId,
              eventType: event.eventType,
              channel: NotificationChannel.EMAIL,
              recipientId: event.recipientId,
              recipientEmail: email,
              title: event.title,
              content: {
                subject: rendered.subject,
                body: rendered.text,
                html: rendered.html,
                actionUrl: event.actionUrl,
                metadata: event.metadata,
              },
              priority: event.priority,
            });
          } else {
            logger.info(
              { recipientId: event.recipientId, type: event.eventType },
              'Email dispatch suppressed by customer preferences.'
            );
          }
        }
      } catch (err) {
        logger.error(
          { error: (err as Error).message, eventId },
          'Failed to enqueue email outbox notification'
        );
      }
    }

    // 3. SMS Boundary (if channel requested)
    if (channels.includes(NotificationChannel.SMS) && event.recipientPhone) {
      try {
        await notificationOutboxService.enqueueJob({
          eventId,
          eventType: event.eventType,
          channel: NotificationChannel.SMS,
          recipientId: event.recipientId,
          recipientPhone: event.recipientPhone,
          title: event.title,
          content: {
            body: event.message,
            actionUrl: event.actionUrl,
            metadata: event.metadata,
          },
          priority: event.priority,
        });
      } catch (err) {
        logger.error({ error: (err as Error).message }, 'Failed to enqueue SMS outbox job');
      }
    }

    // 4. Push Boundary (if channel requested)
    if (channels.includes(NotificationChannel.PUSH) && event.recipientId) {
      try {
        await notificationOutboxService.enqueueJob({
          eventId,
          eventType: event.eventType,
          channel: NotificationChannel.PUSH,
          recipientId: event.recipientId,
          title: event.title,
          content: {
            body: event.message,
            actionUrl: event.actionUrl,
            metadata: event.metadata,
          },
          priority: event.priority,
        });
      } catch (err) {
        logger.error({ error: (err as Error).message }, 'Failed to enqueue Push outbox job');
      }
    }

    return { inAppId: createdInAppId, eventId };
  }

  /**
   * Retrieves paginated in-app notifications for the authenticated customer.
   * Strictly isolates notifications to the requesting user.
   */
  public async getCustomerNotifications(
    userId: string,
    query: NotificationQueryDto
  ): Promise<{ items: NotificationDto[]; meta: PaginationMeta }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      recipientId: new Types.ObjectId(userId),
    };

    if (query.isRead !== undefined) {
      filter.isRead = query.isRead;
    }
    if (query.type) {
      filter.type = query.type;
    }

    const [docs, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const items: NotificationDto[] = docs.map((doc: NotificationDocument) => ({
      id: doc._id.toString(),
      recipientId: doc.recipientId.toString(),
      type: doc.type,
      title: doc.title,
      message: doc.message,
      actionUrl: doc.actionUrl,
      isRead: doc.isRead,
      readAt: doc.readAt ? doc.readAt.toISOString() : undefined,
      priority: doc.priority,
      metadata: doc.metadata,
      createdAt: doc.createdAt.toISOString(),
    }));

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Returns current unread count for customer.
   */
  public async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      recipientId: new Types.ObjectId(userId),
      isRead: false,
    });
  }

  /**
   * Marks a specific notification as read, enforcing customer ownership.
   */
  public async markAsRead(userId: string, notificationId: string): Promise<NotificationDto | null> {
    const doc = await Notification.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        recipientId: new Types.ObjectId(userId),
      },
      {
        $set: { isRead: true, readAt: new Date() },
      },
      { new: true }
    );

    if (!doc) return null;

    return {
      id: doc._id.toString(),
      recipientId: doc.recipientId.toString(),
      type: doc.type,
      title: doc.title,
      message: doc.message,
      actionUrl: doc.actionUrl,
      isRead: doc.isRead,
      readAt: doc.readAt?.toISOString(),
      priority: doc.priority,
      metadata: doc.metadata,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  /**
   * Marks all unread notifications as read for the authenticated customer.
   */
  public async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      {
        recipientId: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        $set: { isRead: true, readAt: new Date() },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Deletes an in-app notification with customer ownership verification.
   */
  public async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    const result = await Notification.findOneAndDelete({
      _id: new Types.ObjectId(notificationId),
      recipientId: new Types.ObjectId(userId),
    });

    return Boolean(result);
  }
}

export const notificationService = new NotificationService();
