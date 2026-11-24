import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User, type UserDocument } from '../../backend/src/models/User.model.js';
import { ShippingConfiguration } from '../../backend/src/models/ShippingConfiguration.model.js';
import { AuditLog } from '../../backend/src/models/AuditLog.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole, ShippingCalculationType } from '@shared/enums.js';
import type { ShippingMethodDto } from '@shared/api.types.js';

describe('Admin Shipping Configuration Management (/api/v1/admin/shipping)', () => {
  let testServer: TestServer;
  let adminUser: UserDocument;
  let regularCustomer: UserDocument;
  let adminToken: string;
  let customerToken: string;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-admin-shipping-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await ShippingConfiguration.deleteMany({});
    await AuditLog.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    const passwordHash = await bcrypt.hash('Password123!', 10);

    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'Manager',
      email: 'admin.shipping@cartivamini.test',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    adminToken = authService.generateAccessToken(adminUser);

    regularCustomer = await User.create({
      firstName: 'Regular',
      lastName: 'Buyer',
      email: 'buyer.shipping@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = authService.generateAccessToken(regularCustomer);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await ShippingConfiguration.deleteMany({});
    await AuditLog.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  // ==========================================================================
  // Authorization Guards
  // ==========================================================================

  it('should reject unauthenticated requests with 401', async () => {
    const res = await testServer.request('/api/v1/admin/shipping/configurations', {
      method: 'GET',
    });
    expect(res.status).toBe(401);
  });

  it('should reject non-admin users with 403 Forbidden', async () => {
    const res = await testServer.request('/api/v1/admin/shipping/configurations', {
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(res.status).toBe(403);
  });

  // ==========================================================================
  // Configuration CRUD Operations
  // ==========================================================================

  let createdConfigId: string;

  it('should allow admin to create a new shipping configuration', async () => {
    const res = await testServer.request('/api/v1/admin/shipping/configurations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        zoneName: 'South-West Regional Zone',
        methodName: 'Standard Regional Delivery',
        carrierName: 'Speedaf Logistics',
        description: 'Doorstep deliveries for Ogun, Oyo, Osun, Ondo, and Ekiti.',
        rateCalculationType: ShippingCalculationType.FLAT,
        baseRate: 3200,
        ratePerAdditionalKg: 0,
        freeShippingThreshold: 60000,
        estimatedDeliveryDaysMin: 2,
        estimatedDeliveryDaysMax: 4,
        countriesCovered: ['Nigeria'],
        statesCovered: ['Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti'],
        currency: 'NGN',
        isActive: true,
      },
    });

    expect(res.status).toBe(201);
    const body = res.body as { success: boolean; data: ShippingMethodDto };
    expect(body.success).toBe(true);
    expect(body.data.zoneName).toBe('South-West Regional Zone');
    expect(body.data.baseRate).toBe(3200);
    expect(body.data.statesCovered).toContain('Ogun');

    createdConfigId = body.data.id || (body.data as unknown as { _id: string })._id;
    expect(createdConfigId).toBeDefined();

    // Verify AuditLog recorded creation
    const log = await AuditLog.findOne({
      entity: 'ShippingConfiguration',
      action: 'CREATE_SHIPPING_CONFIGURATION',
    });
    expect(log).toBeDefined();
    expect(log?.actorRole).toBe('admin');
  });

  it('should allow admin to list all configurations', async () => {
    const res = await testServer.request('/api/v1/admin/shipping/configurations', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = res.body as { success: boolean; data: ShippingMethodDto[] };
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should allow admin to retrieve configuration by ID', async () => {
    const res = await testServer.request(
      `/api/v1/admin/shipping/configurations/${createdConfigId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(res.status).toBe(200);
    const body = res.body as { success: boolean; data: ShippingMethodDto };
    expect(body.success).toBe(true);
    expect(body.data.zoneName).toBe('South-West Regional Zone');
  });

  it('should allow admin to update shipping configuration', async () => {
    const res = await testServer.request(
      `/api/v1/admin/shipping/configurations/${createdConfigId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          baseRate: 3500,
          freeShippingThreshold: 55000,
        },
      }
    );

    expect(res.status).toBe(200);
    const body = res.body as { success: boolean; data: ShippingMethodDto };
    expect(body.success).toBe(true);
    expect(body.data.baseRate).toBe(3500);
    expect(body.data.freeShippingThreshold).toBe(55000);

    // Verify AuditLog recorded update
    const updateLog = await AuditLog.findOne({
      entity: 'ShippingConfiguration',
      action: 'UPDATE_SHIPPING_CONFIGURATION',
    });
    expect(updateLog).toBeDefined();
  });

  it('should allow admin to toggle configuration active status', async () => {
    const res = await testServer.request(
      `/api/v1/admin/shipping/configurations/${createdConfigId}/status`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { isActive: false },
      }
    );

    expect(res.status).toBe(200);
    const body = res.body as { success: boolean; data: ShippingMethodDto };
    expect(body.success).toBe(true);
    expect(body.data.isActive).toBe(false);

    // Verify it is no longer returned in customer availability
    const availRes = await testServer.request(
      '/api/v1/shipping/availability?country=Nigeria&state=Ogun',
      { method: 'GET' }
    );
    const availBody = availRes.body as { data: { isAvailable: boolean } };
    expect(availBody.data.isAvailable).toBe(false);
  });

  it('should allow admin to delete configuration safely', async () => {
    const res = await testServer.request(
      `/api/v1/admin/shipping/configurations/${createdConfigId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(res.status).toBe(204);

    // Verify subsequent lookup yields 404
    const getRes = await testServer.request(
      `/api/v1/admin/shipping/configurations/${createdConfigId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    expect(getRes.status).toBe(404);

    // Verify AuditLog recorded deletion
    const deleteLog = await AuditLog.findOne({
      entity: 'ShippingConfiguration',
      action: 'DELETE_SHIPPING_CONFIGURATION',
    });
    expect(deleteLog).toBeDefined();
  });
});
