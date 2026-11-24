import { Types } from 'mongoose';
import {
  NotificationOutbox,
  type NotificationOutboxDocument,
} from '../../models/NotificationOutbox.model.js';
import { NotificationDelivery } from '../../models/NotificationDelivery.model.js';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationPriority,
  NotificationType,
} from '@shared/enums.js';
import { emailProvider } from './providers/email.provider.js';
import { smsProvider } from './providers/sms.provider.js';
import { pushProvider, type PushNotificationPayload } from './providers/push.provider.js';
import { logger } from '../../config/logger.js';

export interface EnqueueOutboxOptions {
  eventId: string;
  eventType: NotificationType;
  channel: NotificationChannel;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  content: {
    subject?: string;
    body: string;
    html?: string;
    actionUrl?: string;
    templateId?: string;
    metadata?: Record<string, unknown>;
  };
  priority?: NotificationPriority;
  maxAttempts?: number;
}

export class NotificationOutboxService {
  private isProcessing: boolean = false;
  private workerId: string = `worker_${process.pid}_${Math.random().toString(36).substring(2, 7)}`;

  /**
   * Enqueues a notification job in the persistent MongoDB outbox with idempotency protection.
   */
  public async enqueueJob(options: EnqueueOutboxOptions): Promise<NotificationOutboxDocument> {
    const existing = await NotificationOutbox.findOne({
      eventId: options.eventId,
      channel: options.channel,
    });

    if (existing) {
      logger.info(
        { eventId: options.eventId, channel: options.channel },
        'Notification job already enqueued (idempotency matched)'
      );
      return existing;
    }

    const job = await NotificationOutbox.create({
      eventId: options.eventId,
      eventType: options.eventType,
      channel: options.channel,
      recipientId: options.recipientId ? new Types.ObjectId(options.recipientId) : undefined,
      recipientEmail: options.recipientEmail,
      recipientPhone: options.recipientPhone,
      title: options.title,
      content: options.content,
      status: NotificationDeliveryStatus.PENDING,
      priority: options.priority || NotificationPriority.NORMAL,
      attempts: 0,
      maxAttempts: options.maxAttempts || 5,
      nextRetryAt: new Date(),
    });

    // Fire asynchronous processing in background without blocking caller
    setImmediate(() => {
      this.processPendingJobs().catch((err) => {
        logger.error({ error: (err as Error).message }, 'Error in immediate outbox trigger');
      });
    });

    return job;
  }

  /**
   * Pulls and processes pending or retrying outbox jobs.
   * Uses MongoDB locking and exponential backoff.
   */
  public async processPendingJobs(batchSize: number = 10): Promise<number> {
    if (this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      const now = new Date();
      const lockTimeout = new Date(Date.now() - 5 * 60 * 1000); // 5 min lock expiration

      // Find candidates eligible for processing
      const candidateJobs = await NotificationOutbox.find({
        status: {
          $in: [NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.RETRYING],
        },
        nextRetryAt: { $lte: now },
        $or: [{ lockedAt: null }, { lockedAt: { $exists: false } }, { lockedAt: { $lt: lockTimeout } }],
      })
        .sort({ priority: -1, createdAt: 1 })
        .limit(batchSize);

      for (const candidate of candidateJobs) {
        // Attempt atomic lock acquisition
        const lockedJob = await NotificationOutbox.findOneAndUpdate(
          {
            _id: candidate._id,
            $or: [{ lockedAt: null }, { lockedAt: { $exists: false } }, { lockedAt: { $lt: lockTimeout } }],
          },
          {
            $set: {
              lockedAt: now,
              lockedBy: this.workerId,
              status: NotificationDeliveryStatus.PROCESSING,
            },
          },
          { new: true }
        );

        if (!lockedJob) {
          continue; // Another worker locked this job
        }

        await this.dispatchJob(lockedJob);
        processedCount++;
      }
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Exception in outbox batch processing');
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  /**
   * Dispatches a single locked outbox job to the appropriate provider adapter.
   */
  private async dispatchJob(job: NotificationOutboxDocument): Promise<void> {
    const attemptNumber = job.attempts + 1;
    let success = false;
    let providerName = 'unknown';
    let providerMessageId: string | undefined;
    let deliveryError: string | undefined;

    try {
      if (job.channel === NotificationChannel.EMAIL) {
        providerName = emailProvider.providerName;
        if (!job.recipientEmail) {
          throw new Error('Recipient email is missing for EMAIL channel dispatch.');
        }

        const result = await emailProvider.send({
          to: job.recipientEmail,
          subject: job.content.subject || job.title,
          html: job.content.html || `<p>${job.content.body}</p>`,
          text: job.content.body,
        });

        success = result.success;
        providerMessageId = result.providerMessageId;
        deliveryError = result.error;
      } else if (job.channel === NotificationChannel.SMS) {
        providerName = smsProvider.providerName;
        const result = await smsProvider.send({
          toPhone: job.recipientPhone || '',
          message: job.content.body,
        });
        success = result.success;
        deliveryError = result.error;
      } else if (job.channel === NotificationChannel.PUSH) {
        providerName = pushProvider.providerName;
        const result = await pushProvider.send({
          subscription: (job.content.metadata?.subscription as PushNotificationPayload['subscription'] | undefined) || {
            endpoint: '',
            keys: { p256dh: '', auth: '' },
          },
          title: job.title,
          body: job.content.body,
          actionUrl: job.content.actionUrl,
        });
        success = result.success;
        deliveryError = result.error;
      } else {
        throw new Error(`Unsupported notification channel: ${job.channel}`);
      }
    } catch (err) {
      success = false;
      deliveryError = err instanceof Error ? err.message : 'Unknown dispatch error';
    }

    const deliveryStatus = success
      ? NotificationDeliveryStatus.SENT
      : NotificationDeliveryStatus.FAILED;

    // Record delivery attempt in audit table
    await NotificationDelivery.create({
      outboxId: job._id,
      channel: job.channel,
      provider: providerName,
      status: deliveryStatus,
      recipient: job.recipientEmail || job.recipientPhone || job.recipientId?.toString() || 'unknown',
      providerMessageId,
      attemptNumber,
      error: deliveryError,
      sentAt: success ? new Date() : undefined,
    });

    if (success) {
      await NotificationOutbox.findByIdAndUpdate(job._id, {
        $set: {
          status: NotificationDeliveryStatus.SENT,
          attempts: attemptNumber,
          lastAttemptAt: new Date(),
          providerMessageId,
          errorMessage: undefined,
          lockedAt: null,
          lockedBy: null,
        },
      });
      logger.info(
        { outboxId: job._id.toString(), channel: job.channel, providerMessageId },
        'Outbox notification dispatched successfully'
      );
    } else {
      const willRetry = attemptNumber < job.maxAttempts;
      // Exponential backoff: 2s, 4s, 8s, 16s, 32s (capped at 1 hour)
      const delayMs = Math.min(1000 * Math.pow(2, attemptNumber), 60 * 60 * 1000);
      const nextRetryAt = new Date(Date.now() + delayMs);

      await NotificationOutbox.findByIdAndUpdate(job._id, {
        $set: {
          status: willRetry
            ? NotificationDeliveryStatus.RETRYING
            : NotificationDeliveryStatus.FAILED,
          attempts: attemptNumber,
          lastAttemptAt: new Date(),
          nextRetryAt: willRetry ? nextRetryAt : undefined,
          errorMessage: deliveryError,
          lockedAt: null,
          lockedBy: null,
        },
      });

      logger.warn(
        {
          outboxId: job._id.toString(),
          attempts: attemptNumber,
          maxAttempts: job.maxAttempts,
          willRetry,
          error: deliveryError,
        },
        'Outbox notification dispatch failed'
      );
    }
  }

  /**
   * Manually resets a failed or stuck outbox job for administrative retry.
   */
  public async retryJobManually(outboxId: string): Promise<NotificationOutboxDocument | null> {
    const job = await NotificationOutbox.findByIdAndUpdate(
      outboxId,
      {
        $set: {
          status: NotificationDeliveryStatus.PENDING,
          attempts: 0,
          nextRetryAt: new Date(),
          lockedAt: null,
          lockedBy: null,
        },
        $unset: {
          errorMessage: 1,
        },
      },
      { new: true }
    );

    if (job) {
      setImmediate(() => {
        this.processPendingJobs().catch((err) => {
          logger.error({ error: (err as Error).message }, 'Error in manual retry outbox trigger');
        });
      });
    }

    return job;
  }
}

export const notificationOutboxService = new NotificationOutboxService();
