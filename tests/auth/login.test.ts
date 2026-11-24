import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { connectDatabase, disconnectDatabase } from '../../backend/src/config/database.js';
import { User } from '../../backend/src/models/User.model.js';
import { Session } from '../../backend/src/models/Session.model.js';
import { UserRole } from '@shared/enums.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';

const TEST_DB_URI = 'mongodb://localhost:27017/cartiva-mini-auth-login-test';

describe('Authentication — Login Flow (/api/v1/auth/login)', () => {
  const testPassword = 'SecureP@ssword123!';
  let passwordHash: string;
  let testServer: TestServer;

  beforeAll(async () => {
    await connectDatabase(TEST_DB_URI);
    await Promise.all([User.init(), Session.init()]);
    passwordHash = await bcrypt.hash(testPassword, 10);
    testServer = await startTestServer(createApp());
  });

  afterAll(async () => {
    await testServer.close();
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Session.deleteMany({})]);
  });

  it('should authenticate verified customer with valid credentials and set httpOnly cookie', async () => {
    await User.create({
      firstName: 'Babajide',
      lastName: 'Sanwo',
      email: 'babajide@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const res = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'babajide@cartivamini.test',
        password: testPassword,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('babajide@cartivamini.test');
    expect(res.body.data.accessToken).toBeDefined();

    // Verify Set-Cookie header contains cartiva_refresh_token
    const hasRefreshCookie = res.cookies.some(
      (c) => c.includes('cartiva_refresh_token=') && c.includes('HttpOnly')
    );
    expect(hasRefreshCookie).toBe(true);

    // Verify session persisted in MongoDB
    const session = await Session.findOne({ isRevoked: false });
    expect(session).toBeDefined();
    expect(session!.refreshTokenHash).toBeDefined();
  });

  it('should reject login with incorrect password', async () => {
    await User.create({
      firstName: 'Babajide',
      lastName: 'Sanwo',
      email: 'babajide.wrongpass@cartivamini.test',
      passwordHash,
      isEmailVerified: true,
      isActive: true,
    });

    const res = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'babajide.wrongpass@cartivamini.test',
        password: 'IncorrectPassword123!',
      },
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject login for non-existent email', async () => {
    const res = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'nonexistent@cartivamini.test',
        password: testPassword,
      },
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject login for unverified customer accounts', async () => {
    await User.create({
      firstName: 'Unverified',
      lastName: 'Customer',
      email: 'unverified@cartivamini.test',
      passwordHash,
      isEmailVerified: false,
      isActive: true,
    });

    const res = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'unverified@cartivamini.test',
        password: testPassword,
      },
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('should reject login for deactivated or suspended accounts', async () => {
    await User.create({
      firstName: 'Suspended',
      lastName: 'Customer',
      email: 'suspended@cartivamini.test',
      passwordHash,
      isEmailVerified: true,
      isActive: false,
    });

    const res = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'suspended@cartivamini.test',
        password: testPassword,
      },
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('should temporarily lock account after 5 consecutive failed login attempts', async () => {
    const email = 'lockout.target@cartivamini.test';
    await User.create({
      firstName: 'Target',
      lastName: 'User',
      email,
      passwordHash,
      isEmailVerified: true,
      isActive: true,
    });

    // Make 5 consecutive failed attempts
    for (let i = 0; i < 5; i++) {
      const failedRes = await testServer.request('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password: 'BadPassword123!' },
      });
      expect(failedRes.status).toBe(401);
    }

    // 6th attempt should return ACCOUNT_LOCKED even with correct password
    const res = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password: testPassword },
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
    expect(res.body.error.message).toContain('Account is temporarily locked');
  });
});
