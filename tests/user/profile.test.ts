import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole } from '@shared/enums.js';

describe('Customer Profile Management (/api/v1/users/me)', () => {
  let testServer: TestServer;
  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-user-profile-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    const app = createApp();
    testServer = await startTestServer(app);
  });

  afterAll(async () => {
    await User.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should retrieve authenticated customer profile', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      firstName: 'Folake',
      lastName: 'Balogun',
      email: 'folake.profile@cartivamini.test',
      phone: '+2348011223344',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });

    const accessToken = authService.generateAccessToken(user);

    const res = await testServer.request('/api/v1/users/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(user._id.toString());
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data.firstName).toBe('Folake');
    expect(res.body.data.lastName).toBe('Balogun');
    expect(res.body.data.phone).toBe('+2348011223344');
    expect(res.body.data.addressCount).toBe(0);
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('should update customer profile information', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      firstName: 'Tunde',
      lastName: 'Adeleke',
      email: 'tunde.profile@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });

    const accessToken = authService.generateAccessToken(user);

    const res = await testServer.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        firstName: 'Babatunde',
        lastName: 'Adeleke-Smith',
        phone: '+2348099887766',
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.firstName).toBe('Babatunde');
    expect(res.body.data.lastName).toBe('Adeleke-Smith');
    expect(res.body.data.phone).toBe('+2348099887766');

    // Verify DB update
    const inDb = await User.findById(user._id);
    expect(inDb?.firstName).toBe('Babatunde');
    expect(inDb?.lastName).toBe('Adeleke-Smith');
    expect(inDb?.phone).toBe('+2348099887766');
  });

  it('should reject invalid phone number format', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      firstName: 'Invalid',
      lastName: 'Phone',
      email: 'invalid.phone@cartivamini.test',
      passwordHash,
      isEmailVerified: true,
      isActive: true,
    });

    const accessToken = authService.generateAccessToken(user);

    const res = await testServer.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        phone: 'not-a-phone-number',
      },
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should prevent role escalation and modification of administrative fields', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      firstName: 'Hacker',
      lastName: 'Attempt',
      email: 'hacker@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const accessToken = authService.generateAccessToken(user);

    // Attempt to tamper with role, isEmailVerified, isActive, or password
    const res = await testServer.request('/api/v1/users/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        firstName: 'Honest',
        role: 'admin',
        isEmailVerified: false,
        isActive: false,
      },
    });

    // Zod schema is strict, so extra fields cause 422 validation error
    expect(res.status).toBe(422);

    // Verify database remains unaffected
    const inDb = await User.findById(user._id);
    expect(inDb?.role).toBe(UserRole.CUSTOMER);
    expect(inDb?.isEmailVerified).toBe(true);
    expect(inDb?.isActive).toBe(true);
  });

  it('should reject unauthenticated profile requests', async () => {
    const res = await testServer.request('/api/v1/users/me', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
