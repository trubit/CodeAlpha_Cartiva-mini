import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { connectDatabase, disconnectDatabase } from '../../backend/src/config/database.js';
import { User } from '../../backend/src/models/User.model.js';
import { Notification } from '../../backend/src/models/Notification.model.js';
import { NotificationPreference } from '../../backend/src/models/NotificationPreference.model.js';
import { notificationService } from '../../backend/src/modules/notifications/notification.service.js';
import { notificationPreferenceService } from '../../backend/src/modules/notifications/notification-preference.service.js';
import { renderEmailTemplate, escapeHtml } from '../../backend/src/modules/notifications/notification.templates.js';
import { UserRole, NotificationType, NotificationChannel } from '@shared/enums.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';

const TEST_DB_URI = 'mongodb://localhost:27017/cartiva-mini-notifications-test';

interface ApiTestResponse<T = Record<string, unknown>> {
  status?: string;
  data: T;
  message?: string;
}

describe('Phase 17 — In-App Notifications & Customer Preferences', () => {
  let testServer: TestServer;
  let customerAToken: string;
  let customerBToken: string;
  let customerAId: string;
  let customerBId: string;

  beforeAll(async () => {
    await connectDatabase(TEST_DB_URI);
    await Promise.all([User.init(), Notification.init(), NotificationPreference.init()]);
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
      Notification.deleteMany({}),
      NotificationPreference.deleteMany({}),
    ]);

    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    const userA = await User.create({
      firstName: 'Customer',
      lastName: 'Alpha',
      email: 'customer.a@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerAId = userA._id.toString();

    const userB = await User.create({
      firstName: 'Customer',
      lastName: 'Beta',
      email: 'customer.b@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerBId = userB._id.toString();

    // Log in userA
    const loginARes = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'customer.a@cartivamini.test', password: 'TestPass123!' },
    });
    customerAToken = (loginARes.body as ApiTestResponse<{ accessToken: string }>).data.accessToken;

    // Log in userB
    const loginBRes = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'customer.b@cartivamini.test', password: 'TestPass123!' },
    });
    customerBToken = (loginBRes.body as ApiTestResponse<{ accessToken: string }>).data.accessToken;
  });

  describe('1. In-App Notification Operations', () => {
    it('creates in-app notifications and isolates records by recipientId (IDOR Protection)', async () => {
      // Create notification for Customer A
      await notificationService.notify({
        eventType: NotificationType.ORDER_CONFIRMED,
        recipientId: customerAId,
        title: 'Order Confirmed — #ORD-1001',
        message: 'Your order has been confirmed.',
        actionUrl: '/orders/1001',
        channels: [NotificationChannel.IN_APP],
      });

      // Create notification for Customer B
      await notificationService.notify({
        eventType: NotificationType.PAYMENT_SUCCESS,
        recipientId: customerBId,
        title: 'Payment Received — #ORD-2001',
        message: 'Your payment was successful.',
        actionUrl: '/orders/2001',
        channels: [NotificationChannel.IN_APP],
      });

      // Customer A requests notifications
      const resA = await testServer.request('/api/v1/notifications', {
        method: 'GET',
        headers: { Authorization: `Bearer ${customerAToken}` },
      });

      expect(resA.status).toBe(200);
      const itemsA = (resA.body as ApiTestResponse<Array<{ title: string; recipientId: string }>>).data;
      expect(itemsA).toHaveLength(1);
      expect(itemsA[0]?.title).toBe('Order Confirmed — #ORD-1001');
      expect(itemsA[0]?.recipientId).toBe(customerAId);

      // Customer B requests notifications
      const resB = await testServer.request('/api/v1/notifications', {
        method: 'GET',
        headers: { Authorization: `Bearer ${customerBToken}` },
      });

      expect(resB.status).toBe(200);
      const itemsB = (resB.body as ApiTestResponse<Array<{ title: string; recipientId: string }>>).data;
      expect(itemsB).toHaveLength(1);
      expect(itemsB[0]?.title).toBe('Payment Received — #ORD-2001');
      expect(itemsB[0]?.recipientId).toBe(customerBId);
    });

    it('returns accurate unread count and marks notification as read', async () => {
      const notif = await Notification.create({
        recipientId: new mongoose.Types.ObjectId(customerAId),
        type: NotificationType.ORDER_PROCESSING,
        title: 'Order Processing — #ORD-1002',
        message: 'Your order is being packed.',
        isRead: false,
      });

      // Check unread count
      const countRes = await testServer.request('/api/v1/notifications/unread-count', {
        method: 'GET',
        headers: { Authorization: `Bearer ${customerAToken}` },
      });

      expect(countRes.status).toBe(200);
      expect((countRes.body as ApiTestResponse<{ unreadCount: number }>).data.unreadCount).toBe(1);

      // Mark as read
      const readRes = await testServer.request(`/api/v1/notifications/${notif._id.toString()}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customerAToken}` },
      });

      expect(readRes.status).toBe(200);
      expect((readRes.body as ApiTestResponse<{ isRead: boolean }>).data.isRead).toBe(true);

      // Verify unread count is now 0
      const countAfter = await testServer.request('/api/v1/notifications/unread-count', {
        method: 'GET',
        headers: { Authorization: `Bearer ${customerAToken}` },
      });
      expect((countAfter.body as ApiTestResponse<{ unreadCount: number }>).data.unreadCount).toBe(0);
    });

    it('prevents Customer A from reading or modifying Customer B notification (Ownership Check)', async () => {
      const notifB = await Notification.create({
        recipientId: new mongoose.Types.ObjectId(customerBId),
        type: NotificationType.ORDER_PROCESSING,
        title: 'Order Processing',
        message: 'Customer B order notification.',
        isRead: false,
      });

      // Customer A attempts to mark Customer B notification as read
      const hackRes = await testServer.request(`/api/v1/notifications/${notifB._id.toString()}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customerAToken}` },
      });

      expect(hackRes.status).toBe(404);

      // Verify notifB remains unread
      const notifInDb = await Notification.findById(notifB._id);
      expect(notifInDb?.isRead).toBe(false);
    });

    it('marks all notifications as read in bulk', async () => {
      await Notification.create([
        {
          recipientId: new mongoose.Types.ObjectId(customerAId),
          type: NotificationType.ORDER_STATUS,
          title: 'Update 1',
          message: 'Msg 1',
          isRead: false,
        },
        {
          recipientId: new mongoose.Types.ObjectId(customerAId),
          type: NotificationType.ORDER_STATUS,
          title: 'Update 2',
          message: 'Msg 2',
          isRead: false,
        },
      ]);

      const markAllRes = await testServer.request('/api/v1/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customerAToken}` },
      });

      expect(markAllRes.status).toBe(200);
      expect((markAllRes.body as ApiTestResponse<{ modifiedCount: number }>).data.modifiedCount).toBe(2);

      const unreadRemaining = await Notification.countDocuments({
        recipientId: customerAId,
        isRead: false,
      });
      expect(unreadRemaining).toBe(0);
    });

    it('deletes in-app notification when requested by owner', async () => {
      const notif = await Notification.create({
        recipientId: new mongoose.Types.ObjectId(customerAId),
        type: NotificationType.SYSTEM_ALERT,
        title: 'Platform Maintenance',
        message: 'System upgrade notice.',
      });

      const delRes = await testServer.request(`/api/v1/notifications/${notif._id.toString()}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${customerAToken}` },
      });

      expect(delRes.status).toBe(200);
      expect((delRes.body as ApiTestResponse<{ deleted: boolean }>).data.deleted).toBe(true);

      const found = await Notification.findById(notif._id);
      expect(found).toBeNull();
    });
  });

  describe('2. Customer Notification Preferences', () => {
    it('retrieves default preferences and guarantees transactional communications are enabled', async () => {
      const res = await testServer.request('/api/v1/notifications/preferences', {
        method: 'GET',
        headers: { Authorization: `Bearer ${customerAToken}` },
      });

      expect(res.status).toBe(200);
      const prefs = (res.body as ApiTestResponse<{
        orderUpdates: boolean;
        securityAlerts: boolean;
        promotionalEmails: boolean;
        inAppAlerts: boolean;
      }>).data;
      expect(prefs.orderUpdates).toBe(true);
      expect(prefs.securityAlerts).toBe(true);
      expect(prefs.promotionalEmails).toBe(false); // Marketing default is opt-out
      expect(prefs.inAppAlerts).toBe(true);
    });

    it('allows updating marketing preferences while preserving mandatory transactional alerts', async () => {
      const res = await testServer.request('/api/v1/notifications/preferences', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customerAToken}` },
        body: {
          promotionalEmails: true,
          newsletter: true,
          // Attempting to inject orderUpdates: false must be prevented
          orderUpdates: false,
        },
      });

      expect(res.status).toBe(200);
      const prefs = (res.body as ApiTestResponse<{
        promotionalEmails: boolean;
        newsletter: boolean;
        orderUpdates: boolean;
        securityAlerts: boolean;
      }>).data;
      expect(prefs.promotionalEmails).toBe(true);
      expect(prefs.newsletter).toBe(true);
      expect(prefs.orderUpdates).toBe(true); // Mandatory: cannot be disabled
      expect(prefs.securityAlerts).toBe(true); // Mandatory: cannot be disabled
    });

    it('enforces marketing consent checks before dispatching promotional content', async () => {
      // When opted-out (default):
      const permittedBefore = await notificationPreferenceService.isNotificationPermitted(
        customerAId,
        NotificationType.PROMOTION,
        NotificationChannel.EMAIL
      );
      expect(permittedBefore).toBe(false);

      // Opt in
      await notificationPreferenceService.updatePreferences(customerAId, {
        promotionalEmails: true,
      });

      const permittedAfter = await notificationPreferenceService.isNotificationPermitted(
        customerAId,
        NotificationType.PROMOTION,
        NotificationChannel.EMAIL
      );
      expect(permittedAfter).toBe(true);
    });
  });

  describe('3. Template Rendering & HTML Escaping', () => {
    it('safely escapes malicious input to prevent XSS / template injection', () => {
      const maliciousInput = '<script>alert("xss")</script><img src="x" onerror="stealCookie()">';
      const escaped = escapeHtml(maliciousInput);

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&lt;img');
    });

    it('renders branded Cartiva Mini order confirmation email template', () => {
      const rendered = renderEmailTemplate(NotificationType.ORDER_CONFIRMED, {
        recipientName: 'Chidi Mokeme',
        orderNumber: 'ORD-78901',
        orderTotal: 45000,
        actionUrl: 'http://localhost:5180/account/orders/78901',
      });

      expect(rendered.subject).toContain('ORD-78901');
      expect(rendered.html).toContain('CARTIVA');
      expect(rendered.html).toContain('ORD-78901');
      expect(rendered.html).toContain('45,000');
      expect(rendered.text).toContain('ORD-78901');
    });

    it('renders branded payment success template with transaction reference', () => {
      const rendered = renderEmailTemplate(NotificationType.PAYMENT_SUCCESS, {
        recipientName: 'Amina Yusuf',
        orderNumber: 'ORD-55442',
        amount: 28500,
        paymentReference: 'PAY-REF-XYZ-9988',
        actionUrl: 'http://localhost:5180/account/orders/55442',
      });

      expect(rendered.subject).toContain('ORD-55442');
      expect(rendered.html).toContain('PAY-REF-XYZ-9988');
      expect(rendered.html).toContain('28,500');
    });
  });
});
