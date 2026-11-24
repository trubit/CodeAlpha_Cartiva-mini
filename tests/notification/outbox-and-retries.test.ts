import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { connectDatabase, disconnectDatabase } from '../../backend/src/config/database.js';
import { User } from '../../backend/src/models/User.model.js';
import { NotificationOutbox } from '../../backend/src/models/NotificationOutbox.model.js';
import { NotificationDelivery } from '../../backend/src/models/NotificationDelivery.model.js';
import { notificationOutboxService } from '../../backend/src/modules/notifications/notification-outbox.service.js';
import {
  UserRole,
  NotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@shared/enums.js';
import type { NotificationTemplateDto } from '@shared/api.types.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';

const TEST_DB_URI = 'mongodb://localhost:27017/cartiva-mini-outbox-retries-test';

interface ApiTestResponse<T = Record<string, unknown>> {
  status?: string;
  data: T;
  message?: string;
}

describe('Phase 17 — Reliable Outbox Pattern, Retries & Delivery Tracking', () => {
  let testServer: TestServer;
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    await connectDatabase(TEST_DB_URI);
    await Promise.all([User.init(), NotificationOutbox.init(), NotificationDelivery.init()]);
    testServer = await startTestServer(createApp());
  }, 120000);

  afterAll(async () => {
    if (testServer) {
      await testServer.close();
    }
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      NotificationOutbox.deleteMany({}),
      NotificationDelivery.deleteMany({}),
    ]);

    const passwordHash = await bcrypt.hash('AdminPass123!', 10);

    await User.create({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin.notif@cartivamini.test',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });

    await User.create({
      firstName: 'Normal',
      lastName: 'Customer',
      email: 'regular.customer@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    // Admin login
    const adminLoginRes = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin.notif@cartivamini.test', password: 'AdminPass123!' },
    });
    adminToken = (adminLoginRes.body as ApiTestResponse<{ accessToken: string }>).data.accessToken;

    // Customer login
    const customerLoginRes = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'regular.customer@cartivamini.test', password: 'AdminPass123!' },
    });
    customerToken = (customerLoginRes.body as ApiTestResponse<{ accessToken: string }>).data.accessToken;
  });

  describe('1. Outbox Enqueueing & Idempotency', () => {
    it('enqueues an outbox job and prevents duplicate creation for same eventId and channel', async () => {
      const eventId = 'test_event_unique_001';

      const job1 = await notificationOutboxService.enqueueJob({
        eventId,
        eventType: NotificationType.ORDER_CONFIRMED,
        channel: NotificationChannel.EMAIL,
        recipientEmail: 'customer@test.com',
        title: 'Order Confirmed',
        content: {
          subject: 'Order Confirmed — #ORD-999',
          body: 'Your order was confirmed.',
          html: '<p>Your order was confirmed.</p>',
        },
      });

      expect(job1).toBeDefined();
      expect(job1.eventId).toBe(eventId);
      expect(job1.channel).toBe(NotificationChannel.EMAIL);

      // Attempt duplicate enqueue with identical eventId and channel
      const job2 = await notificationOutboxService.enqueueJob({
        eventId,
        eventType: NotificationType.ORDER_CONFIRMED,
        channel: NotificationChannel.EMAIL,
        recipientEmail: 'customer@test.com',
        title: 'Duplicate Attempt',
        content: {
          body: 'Duplicate body',
        },
      });

      // Must match existing job ID without creating a duplicate record
      expect(job2._id.toString()).toBe(job1._id.toString());
      const totalCount = await NotificationOutbox.countDocuments({ eventId });
      expect(totalCount).toBe(1);
    });

    it('processes outbox jobs and creates an immutable audit record in NotificationDelivery', async () => {
      const eventId = 'test_event_dispatch_002';

      await notificationOutboxService.enqueueJob({
        eventId,
        eventType: NotificationType.PAYMENT_SUCCESS,
        channel: NotificationChannel.EMAIL,
        recipientEmail: 'verified@cartivamini.test',
        title: 'Payment Successful',
        content: {
          subject: 'Payment Verified',
          body: 'Payment of N50,000 verified.',
          html: '<p>Payment verified</p>',
        },
      });

      // Execute outbox batch processing
      const processedCount = await notificationOutboxService.processPendingJobs(5);
      expect(processedCount).toBeGreaterThanOrEqual(1);

      // Verify outbox status was updated to SENT
      const updatedJob = await NotificationOutbox.findOne({ eventId });
      expect(updatedJob?.status).toBe(NotificationDeliveryStatus.SENT);
      expect(updatedJob?.attempts).toBe(1);
      expect(updatedJob?.providerMessageId).toBeDefined();

      // Verify immutable delivery attempt record was logged
      const deliveryLog = await NotificationDelivery.findOne({ outboxId: updatedJob?._id });
      expect(deliveryLog).toBeDefined();
      expect(deliveryLog?.status).toBe(NotificationDeliveryStatus.SENT);
      expect(deliveryLog?.provider).toBe('nodemailer_smtp');
      expect(deliveryLog?.recipient).toBe('verified@cartivamini.test');
    });

    it('handles dispatch failure gracefully with exponential backoff and sets RETRYING status', async () => {
      // Create outbox job with invalid channel/missing email to trigger failure
      const failedJob = await NotificationOutbox.create({
        eventId: 'test_event_fail_003',
        eventType: NotificationType.ORDER_STATUS,
        channel: NotificationChannel.EMAIL,
        recipientEmail: '', // Missing recipient email triggers provider failure
        title: 'Failing Job',
        content: {
          subject: 'Failing Notification',
          body: 'This will fail.',
        },
        status: NotificationDeliveryStatus.PENDING,
        attempts: 0,
        maxAttempts: 3,
        nextRetryAt: new Date(Date.now() - 1000), // Ready immediately
      });

      await notificationOutboxService.processPendingJobs(5);

      const refreshed = await NotificationOutbox.findById(failedJob._id);
      expect(refreshed?.status).toBe(NotificationDeliveryStatus.RETRYING);
      expect(refreshed?.attempts).toBe(1);
      expect(refreshed?.errorMessage).toBeDefined();
      expect(refreshed?.nextRetryAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it('marks outbox job as FAILED when maxAttempts limit is reached', async () => {
      // Create a job already at maxAttempts - 1
      const jobAtMax = await NotificationOutbox.create({
        eventId: 'test_event_permanent_fail_004',
        eventType: NotificationType.ORDER_STATUS,
        channel: NotificationChannel.EMAIL,
        recipientEmail: '', // Will fail
        title: 'Permanent Failure Job',
        content: {
          subject: 'Failing Notification',
          body: 'This will exceed max retries.',
        },
        status: NotificationDeliveryStatus.RETRYING,
        attempts: 2,
        maxAttempts: 3,
        nextRetryAt: new Date(Date.now() - 1000),
      });

      await notificationOutboxService.processPendingJobs(5);

      const refreshed = await NotificationOutbox.findById(jobAtMax._id);
      expect(refreshed?.status).toBe(NotificationDeliveryStatus.FAILED);
      expect(refreshed?.attempts).toBe(3);
    });
  });

  describe('2. Administrative Outbox Management & RBAC', () => {
    it('restricts /api/v1/admin/notifications to Admin/Staff roles and rejects regular customers (403)', async () => {
      const customerRes = await testServer.request('/api/v1/admin/notifications', {
        method: 'GET',
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      expect(customerRes.status).toBe(403);
    });

    it('allows Admin to list paginated outbox notifications with status filters', async () => {
      await NotificationOutbox.create([
        {
          eventId: 'admin_test_1',
          eventType: NotificationType.ORDER_CONFIRMED,
          channel: NotificationChannel.EMAIL,
          recipientEmail: 'cust1@test.com',
          title: 'Order 1 Confirmed',
          content: { body: 'Text' },
          status: NotificationDeliveryStatus.SENT,
        },
        {
          eventId: 'admin_test_2',
          eventType: NotificationType.PAYMENT_FAILED,
          channel: NotificationChannel.EMAIL,
          recipientEmail: 'cust2@test.com',
          title: 'Payment 2 Failed',
          content: { body: 'Text' },
          status: NotificationDeliveryStatus.FAILED,
        },
      ]);

      const res = await testServer.request('/api/v1/admin/notifications?status=failed', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const items = (res.body as ApiTestResponse<Array<{ status: NotificationDeliveryStatus; title: string }>>).data;
      expect(items).toHaveLength(1);
      expect(items[0]?.status).toBe(NotificationDeliveryStatus.FAILED);
      expect(items[0]?.title).toBe('Payment 2 Failed');
    });

    it('allows Admin to manually retry a failed notification job', async () => {
      const failedJob = await NotificationOutbox.create({
        eventId: 'admin_manual_retry_001',
        eventType: NotificationType.ORDER_STATUS,
        channel: NotificationChannel.EMAIL,
        recipientEmail: 'retry.recipient@cartivamini.test',
        title: 'Manually Retried Job',
        content: {
          subject: 'Manual Retry Test',
          body: 'Testing administrative retry dispatch.',
        },
        status: NotificationDeliveryStatus.FAILED,
        attempts: 5,
        maxAttempts: 5,
        errorMessage: 'Simulated network timeout',
      });

      const retryRes = await testServer.request(
        `/api/v1/admin/notifications/${failedJob._id.toString()}/retry`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(retryRes.status).toBe(200);
      expect((retryRes.body as ApiTestResponse<{ outboxId: string }>).data.outboxId).toBe(failedJob._id.toString());

      // Verify job was reset to PENDING and attempts reset
      const refreshed = await NotificationOutbox.findById(failedJob._id);
      expect(refreshed?.status).toBe(NotificationDeliveryStatus.PENDING);
      expect(refreshed?.attempts).toBe(0);
      expect(refreshed?.errorMessage).toBeUndefined();
    });

    it('returns the registered templates catalog with variable metadata', async () => {
      const res = await testServer.request('/api/v1/admin/notifications/templates', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const templates = (res.body as ApiTestResponse<NotificationTemplateDto[]>).data;
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThanOrEqual(8);

      const welcomeTpl = templates.find((t: NotificationTemplateDto) => t.id === 'tpl_welcome');
      expect(welcomeTpl).toBeDefined();
      expect(welcomeTpl?.variables).toContain('recipientName');
      expect(welcomeTpl?.variables).toContain('actionUrl');
    });
  });
});
