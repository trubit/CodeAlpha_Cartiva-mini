import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createApp } from '../../backend/src/app.js';
import { connectDatabase, disconnectDatabase } from '../../backend/src/config/database.js';
import { User } from '../../backend/src/models/User.model.js';
import { Session } from '../../backend/src/models/Session.model.js';
import { hashToken } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';

const TEST_DB_URI = 'mongodb://localhost:27017/cartiva-mini-auth-recovery-test';

describe('Authentication — Password Recovery & Change Flow', () => {
  const initialPassword = 'InitialP@ssword123!';
  let testServer: TestServer;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDatabase();
    }
    await connectDatabase(TEST_DB_URI);
    await Promise.all([User.init(), Session.init()]);
    testServer = await startTestServer(createApp());
  }, 60000);

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
    await Promise.all([User.deleteMany({}), Session.deleteMany({})]);
  });

  it('should generate password reset token and return generic message on /forgot-password', async () => {
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    await User.create({
      firstName: 'Folake',
      lastName: 'Balogun',
      email: 'folake@cartivamini.test',
      passwordHash,
      isEmailVerified: true,
      isActive: true,
    });

    const res = await testServer.request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: { email: 'folake@cartivamini.test' },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify token was hashed and stored
    const user = await User.findOne({ email: 'folake@cartivamini.test' }).select(
      '+passwordResetToken +passwordResetExpires'
    );
    expect(user!.passwordResetToken).toBeDefined();
    expect(user!.passwordResetExpires!.getTime()).toBeGreaterThan(Date.now());
  });

  it('should return safe generic message when requesting forgot-password for non-existent email', async () => {
    const res = await testServer.request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: { email: 'nonexistent@cartivamini.test' },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('If an active account exists');
  });

  it('should successfully reset password with valid token and revoke active sessions', async () => {
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawResetToken);
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    const user = await User.create({
      firstName: 'Folake',
      lastName: 'Balogun',
      email: 'folake.reset@cartivamini.test',
      passwordHash,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
      passwordResetToken: tokenHash,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // Create a mock active session
    await Session.create({
      userId: user._id,
      sessionId: 'session-to-revoke',
      refreshTokenHash: 'dummy-hash',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
    });

    const newPassword = 'NewSecureP@ssword123!';
    const res = await testServer.request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: {
        token: rawResetToken,
        password: newPassword,
        confirmPassword: newPassword,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify password was updated in MongoDB
    const updated = await User.findById(user._id).select(
      '+passwordHash +passwordResetToken +tokenVersion'
    );
    expect(updated!.passwordResetToken).toBeUndefined();
    expect(updated!.tokenVersion).toBe(1);

    const isMatch = await bcrypt.compare(newPassword, updated!.passwordHash!);
    expect(isMatch).toBe(true);

    // Verify all active sessions were revoked
    const activeSessions = await Session.find({ userId: user._id, isRevoked: false });
    expect(activeSessions.length).toBe(0);
  });

  it('should reject password reset with expired reset token', async () => {
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawResetToken);

    await User.create({
      firstName: 'Folake',
      lastName: 'Balogun',
      email: 'folake.expired@cartivamini.test',
      passwordHash: 'dummy-hash',
      isEmailVerified: true,
      isActive: true,
      passwordResetToken: tokenHash,
      passwordResetExpires: new Date(Date.now() - 1000), // Expired
    });

    const res = await testServer.request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: {
        token: rawResetToken,
        password: 'NewSecureP@ssword123!',
        confirmPassword: 'NewSecureP@ssword123!',
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('should change password when authenticated with valid current password', async () => {
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const user = await User.create({
      firstName: 'Folake',
      lastName: 'Balogun',
      email: 'folake.change@cartivamini.test',
      passwordHash,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });

    // Login to get access token
    const loginRes = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: user.email, password: initialPassword },
    });
    expect(loginRes.status).toBe(200);

    const accessToken = loginRes.body.data.accessToken;
    const newPassword = 'ChangedSecureP@ssword456!';

    // Change password
    const changeRes = await testServer.request('/api/v1/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        currentPassword: initialPassword,
        newPassword,
        confirmPassword: newPassword,
      },
    });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);

    // Verify user can now log in with the new password
    const loginNewRes = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: user.email, password: newPassword },
    });
    expect(loginNewRes.status).toBe(200);

    // Verify old password no longer works
    const loginOldRes = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: user.email, password: initialPassword },
    });
    expect(loginOldRes.status).toBe(401);
  });
});
