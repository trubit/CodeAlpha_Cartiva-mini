import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Session } from '../../backend/src/models/Session.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole } from '@shared/enums.js';

describe('Customer Email Address Change Workflow (/api/v1/users/me/email-change)', () => {
  let testServer: TestServer;
  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-user-email-change-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Session.deleteMany({});
    const app = createApp();
    testServer = await startTestServer(app);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should submit email change request and store pending token', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      firstName: 'Kemi',
      lastName: 'Adebayo',
      email: 'kemi.current@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const accessToken = authService.generateAccessToken(user);

    const res = await testServer.request('/api/v1/users/me/email-change', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        newEmail: 'kemi.new@cartivamini.test',
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify current email is STILL active and pendingEmail is set
    const inDb = await User.findById(user._id).select('+emailChangeToken +emailChangeExpires');
    expect(inDb?.email).toBe('kemi.current@cartivamini.test');
    expect(inDb?.pendingEmail).toBe('kemi.new@cartivamini.test');
    expect(inDb?.emailChangeToken).toBeDefined();
    expect(inDb?.emailChangeExpires).toBeDefined();
  });

  it('should reject email change if new email is identical to current email', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      firstName: 'Same',
      lastName: 'Email',
      email: 'same.email@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const accessToken = authService.generateAccessToken(user);

    const res = await testServer.request('/api/v1/users/me/email-change', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        newEmail: 'same.email@cartivamini.test',
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject email change if new email is already registered to another account', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    await User.create({
      firstName: 'Existing',
      lastName: 'User',
      email: 'existing.account@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const user = await User.create({
      firstName: 'Changer',
      lastName: 'User',
      email: 'changer@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const accessToken = authService.generateAccessToken(user);

    const res = await testServer.request('/api/v1/users/me/email-change', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        newEmail: 'existing.account@cartivamini.test',
      },
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_IN_USE');
  });

  it('should confirm email change with valid token and revoke active sessions', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.create({
      firstName: 'Ngozi',
      lastName: 'Eze',
      email: 'ngozi.old@cartivamini.test',
      pendingEmail: 'ngozi.new@cartivamini.test',
      emailChangeToken: tokenHash,
      emailChangeExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });

    // Create an active session
    await Session.create({
      userId: user._id,
      sessionId: 'session-before-email-change',
      refreshTokenHash: 'hash123',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const res = await testServer.request('/api/v1/users/me/email-change/verify', {
      method: 'POST',
      body: {
        token: rawToken,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('ngozi.new@cartivamini.test');

    // Verify DB update
    const inDb = await User.findById(user._id).select('+emailChangeToken +emailChangeExpires');
    expect(inDb?.email).toBe('ngozi.new@cartivamini.test');
    expect(inDb?.pendingEmail).toBeUndefined();
    expect(inDb?.emailChangeToken).toBeUndefined();
    expect(inDb?.isEmailVerified).toBe(true);
    expect(inDb?.tokenVersion).toBe(1);

    // Verify sessions revoked
    const sessionInDb = await Session.findOne({ userId: user._id });
    expect(sessionInDb?.isRevoked).toBe(true);
  });

  it('should reject expired email change verification token', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await User.create({
      firstName: 'Expired',
      lastName: 'User',
      email: 'expired.email@cartivamini.test',
      pendingEmail: 'expired.new@cartivamini.test',
      emailChangeToken: tokenHash,
      emailChangeExpires: new Date(Date.now() - 1000), // Expired
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const res = await testServer.request('/api/v1/users/me/email-change/verify', {
      method: 'POST',
      body: {
        token: rawToken,
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});
