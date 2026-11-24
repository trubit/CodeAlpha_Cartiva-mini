import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import express, { type Application } from 'express';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../../backend/src/config/database.js';
import { User } from '../../backend/src/models/User.model.js';
import { UserRole } from '@shared/enums.js';
import {
  authenticate,
  requireRole,
  requireEmailVerified,
} from '../../backend/src/middleware/auth.middleware.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { errorHandler } from '../../backend/src/middleware/error.middleware.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';

const TEST_DB_URI = 'mongodb://localhost:27017/cartiva-mini-auth-rbac-test';

const createRbacTestApp = (): Application => {
  const app = express();
  app.use(express.json());

  app.get('/api/test/customer-area', authenticate, (_req, res) => {
    res.status(200).json({ success: true, message: 'Welcome customer.' });
  });

  app.get('/api/test/admin-portal', authenticate, requireRole(UserRole.ADMIN), (_req, res) => {
    res.status(200).json({ success: true, message: 'Admin access granted.' });
  });

  app.get('/api/test/verified-only', authenticate, requireEmailVerified, (_req, res) => {
    res.status(200).json({ success: true, message: 'Verified email access granted.' });
  });

  app.use(errorHandler);
  return app;
};

describe('Authorization — Role-Based Access Control (RBAC) & Route Guards', () => {
  const password = 'RoleSecureP@ssword123!';
  let customerToken: string;
  let adminToken: string;
  let unverifiedCustomerToken: string;
  let testServer: TestServer;

  beforeAll(async () => {
    await connectDatabase(TEST_DB_URI);
    await User.init();
    testServer = await startTestServer(createRbacTestApp());
  });

  afterAll(async () => {
    await testServer.close();
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Regular Customer
    const customer = await User.create({
      firstName: 'Customer',
      lastName: 'One',
      email: 'customer@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });
    customerToken = authService.generateAccessToken(customer);

    // 2. Administrator
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Super',
      email: 'admin@cartivamini.test',
      passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });
    adminToken = authService.generateAccessToken(admin);

    // 3. Unverified Customer
    const unverified = await User.create({
      firstName: 'Unverified',
      lastName: 'User',
      email: 'unverified@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: false,
      isActive: true,
      tokenVersion: 0,
    });
    unverifiedCustomerToken = authService.generateAccessToken(unverified);
  });

  it('should allow customer to access customer-authenticated endpoints', async () => {
    const res = await testServer.request('/api/test/customer-area', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Welcome customer.');
  });

  it('should strictly deny Customer access to Admin-only routes (403 Forbidden)', async () => {
    const res = await testServer.request('/api/test/admin-portal', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('Access denied');
  });

  it('should allow Admin access to Admin-only routes (200 OK)', async () => {
    const res = await testServer.request('/api/test/admin-portal', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Admin access granted.');
  });

  it('should reject unauthenticated requests without authorization header (401 Unauthorized)', async () => {
    const res = await testServer.request('/api/test/admin-portal');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject unverified customer from verified-only routes (403 Forbidden)', async () => {
    const res = await testServer.request('/api/test/verified-only', {
      headers: { Authorization: `Bearer ${unverifiedCustomerToken}` },
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('should allow verified customer to access verified-only routes (200 OK)', async () => {
    const res = await testServer.request('/api/test/verified-only', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Verified email access granted.');
  });
});
