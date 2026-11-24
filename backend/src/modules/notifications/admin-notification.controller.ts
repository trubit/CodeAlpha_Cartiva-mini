import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { sendSuccess } from '../../utils/response.util.js';
import { AppError } from '../../utils/AppError.js';
import { NotificationOutbox } from '../../models/NotificationOutbox.model.js';
import { NotificationDelivery } from '../../models/NotificationDelivery.model.js';
import { notificationOutboxService } from './notification-outbox.service.js';
import {
  adminNotificationQuerySchema,
  notificationIdParamSchema,
} from './notification.validators.js';
import {
  NotificationDeliveryStatus,
  NotificationType,
  NotificationChannel,
} from '@shared/enums.js';
import type {
  AdminNotificationOutboxDto,
  NotificationTemplateDto,
  PaginationMeta,
} from '@shared/api.types.js';

export class AdminNotificationController {
  /**
   * GET /api/v1/admin/notifications
   * Returns paginated outbox activity and delivery tracking logs.
   */
  public getOutboxActivity = asyncHandler(async (req: Request, res: Response) => {
    const query = adminNotificationQuerySchema.parse(req.query);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.channel) {
      filter.channel = query.channel;
    }
    if (query.eventType) {
      filter.eventType = query.eventType;
    }
    if (query.search) {
      filter.$or = [
        { recipientEmail: { $regex: query.search, $options: 'i' } },
        { title: { $regex: query.search, $options: 'i' } },
        { eventId: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [docs, total] = await Promise.all([
      NotificationOutbox.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      NotificationOutbox.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const items: AdminNotificationOutboxDto[] = docs.map((doc) => ({
      id: doc._id.toString(),
      eventId: doc.eventId,
      eventType: doc.eventType,
      channel: doc.channel,
      recipientId: doc.recipientId?.toString(),
      recipientEmail: doc.recipientEmail,
      recipientPhone: doc.recipientPhone,
      title: doc.title,
      content: {
        subject: doc.content.subject,
        body: doc.content.body,
        actionUrl: doc.content.actionUrl,
        templateId: doc.content.templateId,
      },
      status: doc.status,
      priority: doc.priority,
      attempts: doc.attempts,
      maxAttempts: doc.maxAttempts,
      lastAttemptAt: doc.lastAttemptAt?.toISOString(),
      nextRetryAt: doc.nextRetryAt?.toISOString(),
      errorMessage: doc.errorMessage,
      providerMessageId: doc.providerMessageId,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return sendSuccess(res, items, 'Admin notifications retrieved successfully.', 200, meta);
  });

  /**
   * GET /api/v1/admin/notifications/:notificationId
   * Returns details for a single outbox record along with delivery attempt logs.
   */
  public getNotificationDetails = asyncHandler(async (req: Request, res: Response) => {
    const { notificationId } = notificationIdParamSchema.parse(req.params);

    const outbox = await NotificationOutbox.findById(notificationId);
    if (!outbox) {
      throw AppError.notFound('Outbox notification not found.');
    }

    const deliveryLogs = await NotificationDelivery.find({ outboxId: outbox._id }).sort({
      attemptNumber: 1,
    });

    return sendSuccess(
      res,
      {
        outbox,
        deliveryLogs,
      },
      'Notification details and delivery history retrieved.'
    );
  });

  /**
   * POST /api/v1/admin/notifications/:notificationId/retry
   * Manually retries a failed or expired outbox notification.
   */
  public retryNotification = asyncHandler(async (req: Request, res: Response) => {
    const { notificationId } = notificationIdParamSchema.parse(req.params);

    const job = await notificationOutboxService.retryJobManually(notificationId);
    if (!job) {
      throw AppError.notFound('Outbox notification not found.');
    }

    return sendSuccess(
      res,
      {
        outboxId: job._id.toString(),
        status: job.status,
        message: 'Notification retry initiated successfully.',
      },
      'Notification retry scheduled.'
    );
  });

  /**
   * GET /api/v1/admin/notifications/failed
   * Convenience route returning current failed outbox records.
   */
  public getFailedNotifications = asyncHandler(async (_req: Request, res: Response) => {
    const failedDocs = await NotificationOutbox.find({
      status: NotificationDeliveryStatus.FAILED,
    })
      .sort({ updatedAt: -1 })
      .limit(50);

    return sendSuccess(res, failedDocs, 'Failed notifications retrieved.');
  });

  /**
   * GET /api/v1/admin/notifications/templates
   * Returns template definitions and supported variable keys.
   */
  public getTemplates = asyncHandler(async (_req: Request, res: Response) => {
    const templates: NotificationTemplateDto[] = [
      {
        id: 'tpl_welcome',
        name: 'Customer Account Welcome',
        eventType: NotificationType.ACCOUNT_WELCOME,
        channel: NotificationChannel.EMAIL,
        subjectTemplate: 'Welcome to Cartiva Mini!',
        bodyTemplate: 'Welcome message and catalog discovery links.',
        variables: ['recipientName', 'actionUrl'],
        description: 'Sent upon successful customer account registration.',
      },
      {
        id: 'tpl_email_verification',
        name: 'Email Address Verification',
        eventType: NotificationType.EMAIL_VERIFICATION,
        channel: NotificationChannel.EMAIL,
        subjectTemplate: 'Cartiva Mini — Your Verification Code',
        bodyTemplate: 'Secure 6-digit OTP verification code with 30-minute expiration.',
        variables: ['recipientName', 'otpCode'],
        description: 'Sent during sign-up or verification requests.',
      },
      {
        id: 'tpl_password_reset',
        name: 'Password Reset Request',
        eventType: NotificationType.PASSWORD_RESET,
        channel: NotificationChannel.EMAIL,
        subjectTemplate: 'Cartiva Mini — Password Reset Request',
        bodyTemplate: 'Secure password reset link with 1-hour expiration.',
        variables: ['recipientName', 'actionUrl'],
        description: 'Triggered when customer requests password recovery.',
      },
      {
        id: 'tpl_order_confirmed',
        name: 'Order Confirmation',
        eventType: NotificationType.ORDER_CONFIRMED,
        channel: NotificationChannel.EMAIL,
        subjectTemplate: 'Order Confirmed — #{orderNumber}',
        bodyTemplate: 'Order receipt, items summary, shipping destination, and tracking link.',
        variables: ['recipientName', 'orderNumber', 'orderTotal', 'actionUrl'],
        description: 'Sent immediately following checkout confirmation.',
      },
      {
        id: 'tpl_payment_success',
        name: 'Payment Verification Confirmation',
        eventType: NotificationType.PAYMENT_SUCCESS,
        channel: NotificationChannel.EMAIL,
        subjectTemplate: 'Payment Successful — Order #{orderNumber}',
        bodyTemplate: 'Payment confirmation with gateway reference and amount paid.',
        variables: ['recipientName', 'orderNumber', 'amount', 'paymentReference', 'actionUrl'],
        description: 'Sent after backend verification of Paystack payment.',
      },
      {
        id: 'tpl_order_dispatched',
        name: 'Shipment Dispatch Notification',
        eventType: NotificationType.ORDER_DISPATCHED,
        channel: NotificationChannel.EMAIL,
        subjectTemplate: 'Your Order #{orderNumber} Has Been Dispatched!',
        bodyTemplate: 'Carrier details, tracking number, and live tracking URL.',
        variables: ['recipientName', 'orderNumber', 'carrierName', 'trackingNumber', 'actionUrl'],
        description: 'Sent when order is marked shipped in fulfilment module.',
      },
      {
        id: 'tpl_delivery_completed',
        name: 'Delivery Completion Confirmation',
        eventType: NotificationType.DELIVERY_COMPLETED,
        channel: NotificationChannel.EMAIL,
        subjectTemplate: 'Delivered — Order #{orderNumber}',
        bodyTemplate: 'Delivery completion notice with review and feedback link.',
        variables: ['recipientName', 'orderNumber', 'actionUrl'],
        description: 'Sent when order status changes to DELIVERED.',
      },
      {
        id: 'tpl_refund_update',
        name: 'Refund Processed Notification',
        eventType: NotificationType.REFUND_UPDATE,
        channel: NotificationChannel.EMAIL,
        subjectTemplate: 'Refund Processed — Order #{orderNumber}',
        bodyTemplate: 'Refund transaction notice with amount, refund reference, and credit timeline.',
        variables: ['recipientName', 'orderNumber', 'amount', 'refundReference', 'actionUrl'],
        description: 'Sent after refund approval and payment gateway reconciliation.',
      },
      {
        id: 'tpl_support_response',
        name: 'Customer Support Reply',
        eventType: NotificationType.SUPPORT_RESPONSE,
        channel: NotificationChannel.EMAIL,
        subjectTemplate: 'New Reply on Support Ticket #{ticketNumber}',
        bodyTemplate: 'Ticket reply excerpt and secure link to support ticket center.',
        variables: ['recipientName', 'ticketNumber', 'ticketSubject', 'replyMessage', 'actionUrl'],
        description: 'Sent when support staff responds to a customer ticket.',
      },
      {
        id: 'tpl_low_stock',
        name: 'Inventory Low Stock Alert',
        eventType: NotificationType.LOW_STOCK,
        channel: NotificationChannel.EMAIL,
        subjectTemplate: '[Admin Alert] Low Stock: {productName}',
        bodyTemplate: 'Internal alert to administrative staff when SKU hits replenishment threshold.',
        variables: ['productName', 'currentStock', 'actionUrl'],
        description: 'Administrative notification sent to staff/admins for low stock.',
      },
    ];

    return sendSuccess(res, templates, 'Notification templates retrieved successfully.');
  });
}

export const adminNotificationController = new AdminNotificationController();
