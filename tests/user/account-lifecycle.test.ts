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

describe('Customer Account Lifecycle & Dashboard (/api/v1/users/me/*)', () => {
  let testServer: TestServer;
  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-user-lifecycle-test';

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

  it('should successfully deactivate account with valid password and revoke access', async () => {
    const rawPassword = 'StrongPassword123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const user = await User.create({
      firstName: 'Deactivate',
      lastName: 'Me',
      email: 'deactivate.target@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });

    const accessToken = authService.generateAccessToken(user);

    // Request deactivation
    const deactRes = await testServer.request('/api/v1/users/me/deactivation-request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        password: rawPassword,
        reason: 'Taking a break from shopping',
      },
    });

    expect(deactRes.status).toBe(200);
    expect(deactRes.body.success).toBe(true);

    // Verify DB status
    const inDb = await User.findById(user._id);
    expect(inDb?.isActive).toBe(false);
    expect(inDb?.deactivationReason).toBe('Taking a break from shopping');

    // Verify subsequent authenticated requests with old token are blocked
    const tryAccess = await testServer.request('/api/v1/users/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(tryAccess.status).toBe(403);
    expect(tryAccess.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('should reject deactivation request with incorrect password', async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);
    const user = await User.create({
      firstName: 'Wrong',
      lastName: 'Password',
      email: 'wrong.password@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const accessToken = authService.generateAccessToken(user);

    const res = await testServer.request('/api/v1/users/me/deactivation-request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        password: 'IncorrectPassword999!',
      },
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');

    // Ensure account remains active
    const inDb = await User.findById(user._id);
    expect(inDb?.isActive).toBe(true);
  });

  it('should submit account deletion request and return status', async () => {
    const rawPassword = 'DeletePassword123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const user = await User.create({
      firstName: 'Delete',
      lastName: 'Request',
      email: 'delete.request@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
      deletionStatus: 'none',
    });

    const accessToken = authService.generateAccessToken(user);

    // Submit deletion request
    const delRes = await testServer.request('/api/v1/users/me/deletion-request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        password: rawPassword,
        reason: 'Exercising GDPR Right to Erasure.',
      },
    });

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Verify deletion status endpoint
    const statusRes = await testServer.request('/api/v1/users/me/deletion-request', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.deletionStatus).toBe('pending');
    expect(statusRes.body.data.deletionReason).toBe('Exercising GDPR Right to Erasure.');
  });

  it('should retrieve customer dashboard summary statistics', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      firstName: 'Dashboard',
      lastName: 'Customer',
      email: 'dashboard.summary@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    await Address.create({
      userId: user._id,
      recipientName: 'Home',
      phone: '+2348011223344',
      streetAddress: '10 Central Ave',
      city: 'Yaba',
      state: 'Lagos',
      country: 'Nigeria',
    });

    const accessToken = authService.generateAccessToken(user);

    const res = await testServer.request('/api/v1/users/me/dashboard', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.addressCount).toBe(1);
    expect(res.body.data.cartItemCount).toBe(0);
    expect(res.body.data.orderCount).toBe(0);
    expect(res.body.data.wishlistCount).toBe(0);
    expect(res.body.data.user.email).toBe(user.email);
  });
});
