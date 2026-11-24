import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { connectDatabase, disconnectDatabase } from '../../backend/src/config/database.js';
import { User, type UserDocument } from '../../backend/src/models/User.model.js';
import { Session } from '../../backend/src/models/Session.model.js';
import { UserRole } from '@shared/enums.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';

const TEST_DB_URI = 'mongodb://localhost:27017/cartiva-mini-auth-tokens-test';

describe('Authentication — Tokens, Sessions & Rotation Flow', () => {
  const testPassword = 'SecureP@ssword123!';
  let user: UserDocument;
  let testServer: TestServer;

  beforeAll(async () => {
    await connectDatabase(TEST_DB_URI);
    await Promise.all([User.init(), Session.init()]);
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
    const passwordHash = await bcrypt.hash(testPassword, 10);
    user = await User.create({
      firstName: 'Chidinma',
      lastName: 'Eze',
      email: 'chidinma@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
      tokenVersion: 0,
    });
  });

  it('should allow access to /api/v1/auth/me with valid access token', async () => {
    const loginRes = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: user.email, password: testPassword },
    });
    expect(loginRes.status).toBe(200);

    const accessToken = loginRes.body.data.accessToken;

    const meRes = await testServer.request('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.email).toBe(user.email);
    expect(meRes.body.data.firstName).toBe('Chidinma');
  });

  it('should reject access with invalid or malformed access token', async () => {
    const res = await testServer.request('/api/v1/auth/me', {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should rotate refresh token and issue new access token on /refresh', async () => {
    const loginRes = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: user.email, password: testPassword },
    });
    expect(loginRes.status).toBe(200);

    const refreshCookieStr = loginRes.cookies.find((c) => c.startsWith('cartiva_refresh_token='));
    expect(refreshCookieStr).toBeDefined();

    // Call /refresh with cookie
    const refreshRes = await testServer.request('/api/v1/auth/refresh', {
      method: 'POST',
      cookie: refreshCookieStr,
    });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();

    const newRefreshCookie = refreshRes.cookies.find((c) => c.startsWith('cartiva_refresh_token='));
    expect(newRefreshCookie).toBeDefined();
    expect(newRefreshCookie).not.toEqual(refreshCookieStr); // Token was rotated
  });

  it('should detect token replay and invalidate all sessions when an old refresh token is reused', async () => {
    const loginRes = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: user.email, password: testPassword },
    });
    expect(loginRes.status).toBe(200);

    const oldRefreshCookie = loginRes.cookies.find((c) => c.startsWith('cartiva_refresh_token='))!;

    // Legitimate refresh (rotates token)
    const legitRefresh = await testServer.request('/api/v1/auth/refresh', {
      method: 'POST',
      cookie: oldRefreshCookie,
    });
    expect(legitRefresh.status).toBe(200);

    // Malicious attempt: Replaying the old (now superseded) refresh token
    const replayRes = await testServer.request('/api/v1/auth/refresh', {
      method: 'POST',
      cookie: oldRefreshCookie,
    });

    expect(replayRes.status).toBe(401);
    expect(replayRes.body.success).toBe(false);

    // Verify all sessions were revoked for this user
    const activeSessions = await Session.find({ userId: user._id, isRevoked: false });
    expect(activeSessions.length).toBe(0);
  });

  it('should revoke current session and clear cookie on logout', async () => {
    const loginRes = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: user.email, password: testPassword },
    });
    expect(loginRes.status).toBe(200);

    const refreshCookie = loginRes.cookies.find((c) => c.startsWith('cartiva_refresh_token='))!;

    const logoutRes = await testServer.request('/api/v1/auth/logout', {
      method: 'POST',
      cookie: refreshCookie,
    });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Check cookie cleared in response
    expect(logoutRes.cookies.some((c) => c.includes('cartiva_refresh_token=;'))).toBe(true);

    // Check session in database is revoked
    const revokedCount = await Session.countDocuments({ userId: user._id, isRevoked: true });
    expect(revokedCount).toBe(1);
  });

  it('should support listing and revoking individual sessions', async () => {
    // Create 2 sessions by logging in twice
    await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: user.email, password: testPassword },
    });

    const login2 = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: user.email, password: testPassword },
    });

    const accessToken2 = login2.body.data.accessToken;

    // List sessions
    const sessionsRes = await testServer.request('/api/v1/auth/sessions', {
      headers: { Authorization: `Bearer ${accessToken2}` },
    });

    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.data.length).toBe(2);

    // Revoke first session
    const targetSessionId = sessionsRes.body.data[1].id;
    const deleteRes = await testServer.request(`/api/v1/auth/sessions/${targetSessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken2}` },
    });

    expect(deleteRes.status).toBe(200);

    // Verify active count dropped to 1
    const updatedSessionsRes = await testServer.request('/api/v1/auth/sessions', {
      headers: { Authorization: `Bearer ${accessToken2}` },
    });

    expect(updatedSessionsRes.body.data.length).toBe(1);
  });

  it('should revoke all user sessions on /logout-all', async () => {
    const loginRes = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: user.email, password: testPassword },
    });

    const accessToken = loginRes.body.data.accessToken;

    const logoutAllRes = await testServer.request('/api/v1/auth/logout-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(logoutAllRes.status).toBe(200);

    const activeSessions = await Session.find({ userId: user._id, isRevoked: false });
    expect(activeSessions.length).toBe(0);

    // Subsequent authenticated request fails because tokenVersion was incremented
    const meRes = await testServer.request('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(meRes.status).toBe(401);
  });
});
