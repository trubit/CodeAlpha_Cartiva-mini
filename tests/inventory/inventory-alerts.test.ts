import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product, type ProductDocument } from '../../backend/src/models/Product.model.js';
import { Notification } from '../../backend/src/models/Notification.model.js';
import { InventoryMovement } from '../../backend/src/models/InventoryMovement.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole, ProductStatus, NotificationType } from '@shared/enums.js';

describe('Inventory Alerts & Authorization Controls', () => {
  let testServer: TestServer;
  let adminToken: string;
  let customerToken: string;
  let testCategory: CategoryDocument;
  let alertProduct: ProductDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-inventory-alerts-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Notification.deleteMany({});
    await InventoryMovement.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const admin = await User.create({
      firstName: 'Inventory',
      lastName: 'Manager',
      email: 'admin.alerts@cartivamini.test',
      phone: '+2348022334460',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    adminToken = authService.generateAccessToken(admin);

    const customer = await User.create({
      firstName: 'Regular',
      lastName: 'Customer',
      email: 'customer.alerts@cartivamini.test',
      phone: '+2348022334461',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = authService.generateAccessToken(customer);

    testCategory = await Category.create({
      name: 'Cameras & Drones',
      slug: 'cameras-drones-alerts',
      isActive: true,
    });

    alertProduct = await Product.create({
      title: 'Action Camera 4K',
      name: 'Action Camera 4K',
      slug: 'action-camera-4k-alerts',
      sku: 'CAM-ACT-4K-01',
      shortDescription: 'Ultra HD 4K Action Camera',
      fullDescription: 'Waterproof 4K action camera with EIS stabilization.',
      regularPrice: 85000,
      currency: 'NGN',
      categoryId: testCategory._id,
      stockQuantity: 12,
      reservedQuantity: 0,
      lowStockThreshold: 5,
      isInventoryTracked: true,
      status: ProductStatus.PUBLISHED,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Notification.deleteMany({});
    await InventoryMovement.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should detect low-stock status when available quantity falls to or below threshold', async () => {
    // Deduct 8 units: 12 - 8 = 4 (threshold is 5)
    const res = await testServer.request(
      `/api/v1/admin/inventory/${alertProduct._id.toString()}/deduct`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          quantity: 8,
          reason: 'Defective units decommissioned',
          movementType: 'damaged_stock',
        },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.onHandQuantity).toBe(4);
    expect(res.body.data.status).toBe('low_stock');

    // Verify low-stock notification was created
    const notifications = await Notification.find({
      type: NotificationType.LOW_STOCK,
      message: new RegExp('CAM-ACT-4K-01', 'i'),
    });
    expect(notifications.length).toBe(1);
  });

  it('should prevent duplicate low-stock alerts within the deduplication window', async () => {
    // Deduct another unit: 4 - 1 = 3 (still below threshold)
    const res = await testServer.request(
      `/api/v1/admin/inventory/${alertProduct._id.toString()}/deduct`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          quantity: 1,
          reason: 'Another damaged unit removed',
          movementType: 'damaged_stock',
        },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.onHandQuantity).toBe(3);

    // Verify notification count is still 1 (not duplicated)
    const notifications = await Notification.find({
      type: NotificationType.LOW_STOCK,
      message: new RegExp('CAM-ACT-4K-01', 'i'),
    });
    expect(notifications.length).toBe(1);
  });

  it('should detect out-of-stock status when available quantity reaches 0', async () => {
    // Adjust stock to 0
    const res = await testServer.request(
      `/api/v1/admin/inventory/${alertProduct._id.toString()}/adjust`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          targetQuantity: 0,
          reason: 'Reconciled to zero stock remaining',
        },
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.onHandQuantity).toBe(0);
    expect(res.body.data.availableQuantity).toBe(0);
    expect(res.body.data.status).toBe('out_of_stock');
  });

  it('should query /admin/inventory/summary and reflect exact counts', async () => {
    const res = await testServer.request('/api/v1/admin/inventory/summary', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalItems).toBeGreaterThanOrEqual(1);
    expect(res.body.data.outOfStockCount).toBeGreaterThanOrEqual(1);
  });

  it('should reject customer access to administrative inventory endpoints', async () => {
    const endpoints = [
      { method: 'GET', path: '/api/v1/admin/inventory' },
      { method: 'GET', path: '/api/v1/admin/inventory/summary' },
      { method: 'GET', path: '/api/v1/admin/inventory/low-stock' },
      { method: 'GET', path: '/api/v1/admin/inventory/out-of-stock' },
      { method: 'GET', path: `/api/v1/admin/inventory/${alertProduct._id.toString()}` },
      {
        method: 'POST',
        path: `/api/v1/admin/inventory/${alertProduct._id.toString()}/receive`,
        body: { quantity: 5, reason: 'Unauthorized customer receive' },
      },
    ];

    for (const ep of endpoints) {
      const res = await testServer.request(ep.path, {
        method: ep.method,
        headers: { Authorization: `Bearer ${customerToken}` },
        body: ep.body,
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });
});
