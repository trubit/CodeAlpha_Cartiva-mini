import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../../backend/src/app.js';
import { connectDatabase, disconnectDatabase } from '../../backend/src/config/database.js';
import { User } from '../../backend/src/models/User.model.js';
import { Otp } from '../../backend/src/models/Otp.model.js';
import { hashOtp } from '../../backend/src/modules/auth/otp.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';

const TEST_DB_URI = 'mongodb://localhost:27017/cartiva-mini-auth-verify-test';

describe('Authentication — Email Verification Flow (6-Digit OTP)', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    await connectDatabase(TEST_DB_URI);
    await User.init();
    await Otp.init();
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
    await User.deleteMany({});
    await Otp.deleteMany({});
  });

  it('should successfully verify email with a valid 6-digit OTP code', async () => {
    const rawOtp = '582910';
    const otpHash = hashOtp(rawOtp);

    const user = await User.create({
      firstName: 'Tolu',
      lastName: 'Adeleke',
      email: 'tolu@cartivamini.test',
      passwordHash: 'dummy-hashed-pass',
      isEmailVerified: false,
    });

    await Otp.create({
      userId: user._id,
      email: 'tolu@cartivamini.test',
      otpHash,
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      maxAttempts: 5,
      attempts: 0,
      consumed: false,
    });

    const res = await testServer.request('/api/v1/auth/verify-email', {
      method: 'POST',
      body: { email: 'tolu@cartivamini.test', otp: rawOtp },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify user in MongoDB is marked verified
    const updated = await User.findById(user._id);
    expect(updated!.isEmailVerified).toBe(true);
  });

  it('should reject verification with an expired 6-digit OTP', async () => {
    const rawOtp = '123456';
    const otpHash = hashOtp(rawOtp);

    const user = await User.create({
      firstName: 'Tolu',
      lastName: 'Adeleke',
      email: 'tolu.expired@cartivamini.test',
      passwordHash: 'dummy-hashed-pass',
      isEmailVerified: false,
    });

    await Otp.create({
      userId: user._id,
      email: 'tolu.expired@cartivamini.test',
      otpHash,
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() - 1000), // Expired
      maxAttempts: 5,
      attempts: 0,
      consumed: false,
    });

    const res = await testServer.request('/api/v1/auth/verify-email', {
      method: 'POST',
      body: { email: 'tolu.expired@cartivamini.test', otp: rawOtp },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_OTP');
  });

  it('should reject verification with an invalid format OTP (non-6 digits)', async () => {
    const res = await testServer.request('/api/v1/auth/verify-email', {
      method: 'POST',
      body: { email: 'tolu@cartivamini.test', otp: '123' },
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('should allow requesting a new OTP verification code via resend-verification', async () => {
    await User.create({
      firstName: 'Tolu',
      lastName: 'Adeleke',
      email: 'tolu.resend@cartivamini.test',
      passwordHash: 'dummy-hashed-pass',
      isEmailVerified: false,
    });

    const res = await testServer.request('/api/v1/auth/resend-verification', {
      method: 'POST',
      body: { email: 'tolu.resend@cartivamini.test' },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const otpDoc = await Otp.findOne({ email: 'tolu.resend@cartivamini.test', consumed: false });
    expect(otpDoc).toBeDefined();
    expect(otpDoc!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should return safe generic message when resending to non-existent email (enumeration protection)', async () => {
    const res = await testServer.request('/api/v1/auth/resend-verification', {
      method: 'POST',
      body: { email: 'nobody@cartivamini.test' },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('If an account exists with this email');
  });
});
