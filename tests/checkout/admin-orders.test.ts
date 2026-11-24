import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User, type UserDocument } from '../../backend/src/models/User.model.js';
import { Order, type OrderDocument } from '../../backend/src/models/Order.model.js';
import { AuditLog } from '../../backend/src/models/AuditLog.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole, OrderStatus, PaymentStatus } from '@shared/enums.js';

describe('Administrator Order Management (/api/v1/admin/orders)', () => {
  let testServer: TestServer;
  let adminUser: UserDocument;
  let customerUser: UserDocument;
  let adminToken: string;
  let customerToken: string;
  let testOrder: OrderDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-admin-orders-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Order.deleteMany({});
    await AuditLog.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);
    adminUser = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin.orders@cartivamini.test',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    adminToken = authService.generateAccessToken(adminUser);

    customerUser = await User.create({
      firstName: 'Ordinary',
      lastName: 'Customer',
      email: 'customer.orders@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = authService.generateAccessToken(customerUser);

    // Seed test order
    testOrder = await Order.create({
      orderNumber: 'ORD-20261103-ADM001',
      userId: customerUser._id,
      customerEmail: 'customer.orders@cartivamini.test',
      customerPhone: '+2348011998877',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          sku: 'SMART-WATCH-001',
          title: 'Smart Fitness Tracker',
          unitPrice: 32000,
          unitPriceMinor: 3200000,
          quantity: 1,
          subtotal: 32000,
          subtotalMinor: 3200000,
        },
      ],
      shippingAddress: {
        recipientName: 'Ordinary Customer',
        phone: '+2348011998877',
        streetAddress: '55 Isaac John Street, GRA',
        city: 'Ikeja',
        state: 'Lagos',
        country: 'Nigeria',
      },
      shippingMethodName: 'Standard Express',
      subtotal: 32000,
      subtotalMinor: 3200000,
      shippingFee: 2000,
      shippingFeeMinor: 200000,
      totalAmount: 34000,
      totalAmountMinor: 3400000,
      currency: 'NGN',
      orderStatus: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
    });
  });

  afterAll(async () => {
    await testServer.close();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('rejects non-admin customers with 403 Forbidden', async () => {
    const res = await fetch(`${testServer.url}/api/v1/admin/orders`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('allows authorized administrators to query orders with filters', async () => {
    const res = await fetch(
      `${testServer.url}/api/v1/admin/orders?orderStatus=${OrderStatus.CONFIRMED}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].orderNumber).toBe(testOrder.orderNumber);
    expect(body.data[0].orderStatus).toBe(OrderStatus.CONFIRMED);
  });

  it('allows administrators to retrieve full order detail and reservation status', async () => {
    const res = await fetch(`${testServer.url}/api/v1/admin/orders/${testOrder.orderNumber}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.orderNumber).toBe(testOrder.orderNumber);
    expect(body.data.shippingAddress.recipientName).toBe('Ordinary Customer');
  });

  it('allows permitted status transition (CONFIRMED -> PROCESSING)', async () => {
    const res = await fetch(
      `${testServer.url}/api/v1/admin/orders/${testOrder.orderNumber}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          orderStatus: OrderStatus.PROCESSING,
          notes: 'Order sent to fulfillment warehouse for packing.',
        }),
      }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.orderStatus).toBe(OrderStatus.PROCESSING);

    // Verify audit record was created
    const auditLogs = await AuditLog.find({
      $or: [
        { entity: 'Order', entityId: testOrder._id.toString() },
        { resource: 'Order', resourceId: testOrder._id },
      ],
      action: { $in: ['ORDER_STATUS_UPDATE', 'ORDER_STATUS_UPDATED'] },
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects invalid status transitions (e.g. invalid lifecycle progression)', async () => {
    const res = await fetch(
      `${testServer.url}/api/v1/admin/orders/${testOrder.orderNumber}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          orderStatus: OrderStatus.PENDING_PAYMENT,
        }),
      }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_ORDER_STATUS');
  });

  it('retrieves order audit history for administrative review', async () => {
    const res = await fetch(
      `${testServer.url}/api/v1/admin/orders/${testOrder.orderNumber}/audit`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });
});
