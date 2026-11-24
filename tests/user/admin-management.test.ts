import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Address } from '../../backend/src/models/Address.model.js';
import { Session } from '../../backend/src/models/Session.model.js';
import { AuditLog } from '../../backend/src/models/AuditLog.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole } from '@shared/enums.js';

describe('Admin Customer Management (/api/v1/admin/users)', () => {
  let testServer: TestServer;
  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-admin-users-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Address.deleteMany({});
    await Session.deleteMany({});
    await AuditLog.deleteMany({});
    const app = createApp();
    testServer = await startTestServer(app);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Address.deleteMany({});
    await Session.deleteMany({});
    await AuditLog.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should reject unauthenticated requests to admin users endpoint with 401', async () => {
    const res = await testServer.request('/api/v1/admin/users', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject non-admin customer requests with 403 Forbidden', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const customer = await User.create({
      firstName: 'Customer',
      lastName: 'User',
      email: 'customer.forbidden@cartivamini.test',
      phone: '+2348000000001',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });

    const customerToken = authService.generateAccessToken(customer);

    const res = await testServer.request('/api/v1/admin/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow administrator to list and search customer accounts with pagination', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Super',
      email: 'admin.list@cartivamini.test',
      phone: '+2348000000002',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });

    const adminToken = authService.generateAccessToken(admin);

    // Create 3 customers for searching
    await User.create([
      {
        firstName: 'Ngozi',
        lastName: 'Eze',
        email: 'ngozi.eze@cartivamini.test',
        phone: '+2348000000010',
        passwordHash,
        role: UserRole.CUSTOMER,
        isEmailVerified: true,
        isActive: true,
      },
      {
        firstName: 'Emeka',
        lastName: 'Okafor',
        email: 'emeka.okafor@cartivamini.test',
        phone: '+2348000000011',
        passwordHash,
        role: UserRole.CUSTOMER,
        isEmailVerified: true,
        isActive: true,
      },
      {
        firstName: 'Kemi',
        lastName: 'Adeyemi',
        email: 'kemi.adeyemi@cartivamini.test',
        phone: '+2348000000012',
        passwordHash,
        role: UserRole.CUSTOMER,
        isEmailVerified: true,
        isActive: false,
      },
    ]);

    // List all
    const listRes = await testServer.request('/api/v1/admin/users?page=1&limit=10', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.users.length).toBeGreaterThanOrEqual(4); // admin + 3 customers
    expect(listRes.body.data.pagination).toBeDefined();
    expect(listRes.body.data.pagination.page).toBe(1);

    // Search by name
    const searchRes = await testServer.request('/api/v1/admin/users?search=ngozi', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.users.length).toBe(1);
    expect(searchRes.body.data.users[0].firstName).toBe('Ngozi');

    // Filter by isActive=false
    const filterRes = await testServer.request('/api/v1/admin/users?isActive=false', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(filterRes.status).toBe(200);
    expect(
      filterRes.body.data.users.some(
        (u: { email: string }) => u.email === 'kemi.adeyemi@cartivamini.test'
      )
    ).toBe(true);
  });

  it('should allow administrator to view customer detail and saved addresses', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Viewer',
      email: 'admin.viewer@cartivamini.test',
      phone: '+2348000000003',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });

    const targetCustomer = await User.create({
      firstName: 'Chidi',
      lastName: 'Nwosu',
      email: 'chidi.nwosu@cartivamini.test',
      phone: '+2348000000015',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });

    await Address.create({
      userId: targetCustomer._id,
      label: 'Office HQ',
      recipientName: 'Chidi Nwosu',
      phone: '+2348000000015',
      streetAddress: '12 Marina Road, CMS',
      city: 'Lagos Island',
      state: 'Lagos',
      country: 'Nigeria',
      postalCode: '100221',
      isDefaultShipping: true,
      deliveryInstructions: 'Ring bell on 4th floor',
    });

    const adminToken = authService.generateAccessToken(admin);

    const res = await testServer.request(`/api/v1/admin/users/${targetCustomer._id.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(targetCustomer._id.toString());
    expect(res.body.data.email).toBe(targetCustomer.email);
    expect(res.body.data.addresses.length).toBe(1);
    expect(res.body.data.addresses[0].streetAddress).toBe('12 Marina Road, CMS');
    expect(res.body.data.addresses[0].deliveryInstructions).toBe('Ring bell on 4th floor');
  });

  it('should suspend customer account, revoke sessions, and record an audit log', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Moderator',
      email: 'admin.moderator@cartivamini.test',
      phone: '+2348000000004',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });

    const customer = await User.create({
      firstName: 'Suspicious',
      lastName: 'User',
      email: 'suspicious.user@cartivamini.test',
      phone: '+2348000000019',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });

    // Create active session for customer
    await Session.create({
      userId: customer._id,
      sessionId: 'session-id-12345',
      refreshTokenHash: 'fake-refresh-token-hash-12345',
      ipAddress: '127.0.0.1',
      userAgent: 'TestBrowser',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
    });

    const adminToken = authService.generateAccessToken(admin);

    const suspendRes = await testServer.request(
      `/api/v1/admin/users/${customer._id.toString()}/status`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: {
          isActive: false,
          reason: 'Suspicious card testing behavior detected.',
        },
      }
    );

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.success).toBe(true);
    expect(suspendRes.body.data.isActive).toBe(false);

    // Verify user is inactive in database and tokenVersion incremented
    const updatedCustomer = await User.findById(customer._id);
    expect(updatedCustomer?.isActive).toBe(false);
    expect(updatedCustomer?.tokenVersion).toBe(1);

    // Verify sessions revoked
    const remainingSessions = await Session.find({
      userId: customer._id,
      isRevoked: false,
    });
    expect(remainingSessions.length).toBe(0);

    // Verify AuditLog was recorded
    const auditRecord = await AuditLog.findOne({
      action: 'ADMIN_UPDATE_USER_STATUS',
      entityId: customer._id.toString(),
    });
    expect(auditRecord).toBeDefined();
    expect(auditRecord?.actorId?.toString()).toBe(admin._id.toString());
    expect(auditRecord?.changesDiff?.after?.reason).toBe(
      'Suspicious card testing behavior detected.'
    );
  });

  it('should prevent an administrator from suspending their own account', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const admin = await User.create({
      firstName: 'Self',
      lastName: 'Admin',
      email: 'admin.self@cartivamini.test',
      phone: '+2348000000005',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });

    const adminToken = authService.generateAccessToken(admin);

    const res = await testServer.request(`/api/v1/admin/users/${admin._id.toString()}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: {
        isActive: false,
        reason: 'Attempting self-deactivation',
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain(
      'Administrators cannot suspend or deactivate their own account'
    );
  });
});
