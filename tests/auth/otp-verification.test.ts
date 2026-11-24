import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { connectDatabase, disconnectDatabase } from '../../backend/src/config/database.js';
import { User } from '../../backend/src/models/User.model.js';
import { Otp } from '../../backend/src/models/Otp.model.js';
import { otpService, hashOtp } from '../../backend/src/modules/auth/otp.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';

const TEST_DB_URI = 'mongodb://localhost:27017/cartiva-mini-otp-test';

describe('Authentication — 6-Digit OTP Verification Engine', () => {
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

  it('1. should generate a 6-digit OTP preserving leading zeros', async () => {
    const user = await User.create({
      firstName: 'Fatima',
      lastName: 'Bello',
      email: 'fatima@cartivamini.test',
      passwordHash: 'dummy-hash',
      isEmailVerified: false,
    });

    const result = await otpService.generateAndSendOtp(
      { id: user._id.toString(), email: user.email, firstName: user.firstName },
      'email_verification'
    );

    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.cooldownSeconds).toBe(60);

    const doc = await Otp.findOne({ email: 'fatima@cartivamini.test', consumed: false });
    expect(doc).toBeDefined();
    expect(doc!.otpHash).toBeDefined();
    expect(doc!.otpHash.length).toBe(64); // SHA-256 hex string length
    expect(doc!.attempts).toBe(0);
    expect(doc!.maxAttempts).toBe(5);
  });

  it('2. should verify email successfully with leading-zero 6-digit OTP (004821)', async () => {
    const rawOtp = '004821';
    const otpHash = hashOtp(rawOtp);

    const user = await User.create({
      firstName: 'Chidi',
      lastName: 'Okafor',
      email: 'chidi@cartivamini.test',
      passwordHash: 'dummy-hash',
      isEmailVerified: false,
    });

    await Otp.create({
      userId: user._id,
      email: 'chidi@cartivamini.test',
      otpHash,
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      maxAttempts: 5,
      attempts: 0,
      consumed: false,
    });

    const res = await testServer.request('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: {
        email: 'chidi@cartivamini.test',
        otp: rawOtp,
        purpose: 'email_verification',
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Verification successful');

    // Verify user state in MongoDB
    const updatedUser = await User.findById(user._id);
    expect(updatedUser!.isEmailVerified).toBe(true);

    // Verify OTP is marked consumed
    const updatedOtp = await Otp.findOne({ email: 'chidi@cartivamini.test' });
    expect(updatedOtp!.consumed).toBe(true);
  });

  it('3. should reject OTP reuse (consumed code cannot be used again)', async () => {
    const rawOtp = '774102';
    const otpHash = hashOtp(rawOtp);

    const user = await User.create({
      firstName: 'Seyi',
      lastName: 'Makinde',
      email: 'seyi@cartivamini.test',
      passwordHash: 'dummy-hash',
      isEmailVerified: true,
    });

    // Create already-consumed OTP
    await Otp.create({
      userId: user._id,
      email: 'seyi@cartivamini.test',
      otpHash,
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      maxAttempts: 5,
      attempts: 0,
      consumed: true, // Already used
    });

    const res = await testServer.request('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: {
        email: 'seyi@cartivamini.test',
        otp: rawOtp,
        purpose: 'email_verification',
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_OTP');
  });

  it('4. should reject incorrect OTP and decrement remaining attempts', async () => {
    const rawOtp = '391048';
    const otpHash = hashOtp(rawOtp);

    const user = await User.create({
      firstName: 'Amaka',
      lastName: 'Nwosu',
      email: 'amaka@cartivamini.test',
      passwordHash: 'dummy-hash',
      isEmailVerified: false,
    });

    await Otp.create({
      userId: user._id,
      email: 'amaka@cartivamini.test',
      otpHash,
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      maxAttempts: 5,
      attempts: 0,
      consumed: false,
    });

    const res = await testServer.request('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: {
        email: 'amaka@cartivamini.test',
        otp: '999999', // Incorrect
        purpose: 'email_verification',
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('4 attempt(s) remaining');

    // Confirm attempts incremented in database
    const otpDoc = await Otp.findOne({ email: 'amaka@cartivamini.test' });
    expect(otpDoc!.attempts).toBe(1);
    expect(otpDoc!.consumed).toBe(false);
  });

  it('5. should invalidate OTP when maximum attempts (5) are exceeded', async () => {
    const rawOtp = '112233';
    const otpHash = hashOtp(rawOtp);

    const user = await User.create({
      firstName: 'Dayo',
      lastName: 'Balogun',
      email: 'dayo@cartivamini.test',
      passwordHash: 'dummy-hash',
      isEmailVerified: false,
    });

    await Otp.create({
      userId: user._id,
      email: 'dayo@cartivamini.test',
      otpHash,
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      maxAttempts: 5,
      attempts: 4, // 1 remaining
      consumed: false,
    });

    const res = await testServer.request('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: {
        email: 'dayo@cartivamini.test',
        otp: '000000', // 5th failed attempt
        purpose: 'email_verification',
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OTP_ATTEMPTS_EXCEEDED');

    // OTP should now be marked consumed/invalidated
    const otpDoc = await Otp.findOne({ email: 'dayo@cartivamini.test' });
    expect(otpDoc!.consumed).toBe(true);
    expect(otpDoc!.attempts).toBe(5);
  });

  it('6. should reject expired OTP', async () => {
    const rawOtp = '654321';
    const otpHash = hashOtp(rawOtp);

    const user = await User.create({
      firstName: 'Kelechi',
      lastName: 'Iheanacho',
      email: 'kelechi@cartivamini.test',
      passwordHash: 'dummy-hash',
      isEmailVerified: false,
    });

    await Otp.create({
      userId: user._id,
      email: 'kelechi@cartivamini.test',
      otpHash,
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
      maxAttempts: 5,
      attempts: 0,
      consumed: false,
    });

    const res = await testServer.request('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: {
        email: 'kelechi@cartivamini.test',
        otp: rawOtp,
        purpose: 'email_verification',
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OTP');
    expect(res.body.error.message).toContain('expired');
  });

  it('7. should enforce 60-second cooldown on resend-otp', async () => {
    const user = await User.create({
      firstName: 'Emeka',
      lastName: 'Eze',
      email: 'emeka@cartivamini.test',
      passwordHash: 'dummy-hash',
      isEmailVerified: false,
    });

    // Create an OTP dispatched 15 seconds ago
    await Otp.create({
      userId: user._id,
      email: 'emeka@cartivamini.test',
      otpHash: hashOtp('111222'),
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: new Date(Date.now() - 15 * 1000),
      maxAttempts: 5,
      attempts: 0,
      consumed: false,
    });

    const res = await testServer.request('/api/v1/auth/resend-otp', {
      method: 'POST',
      body: {
        email: 'emeka@cartivamini.test',
        purpose: 'email_verification',
      },
    });

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Please wait');
  });

  it('8. should allow resend after 60s cooldown and invalidate previous OTP', async () => {
    const user = await User.create({
      firstName: 'Zainab',
      lastName: 'Ahmed',
      email: 'zainab@cartivamini.test',
      passwordHash: 'dummy-hash',
      isEmailVerified: false,
    });

    // Create an old OTP dispatched 70 seconds ago
    const oldOtp = await Otp.create({
      userId: user._id,
      email: 'zainab@cartivamini.test',
      otpHash: hashOtp('334455'),
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: new Date(Date.now() - 70 * 1000),
      maxAttempts: 5,
      attempts: 0,
      consumed: false,
    });

    const res = await testServer.request('/api/v1/auth/resend-otp', {
      method: 'POST',
      body: {
        email: 'zainab@cartivamini.test',
        purpose: 'email_verification',
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Old OTP must now be marked consumed
    const oldUpdated = await Otp.findById(oldOtp._id);
    expect(oldUpdated!.consumed).toBe(true);

    // New unconsumed OTP must be created
    const newOtp = await Otp.findOne({ email: 'zainab@cartivamini.test', consumed: false });
    expect(newOtp).toBeDefined();
    expect(newOtp!._id.toString()).not.toBe(oldOtp._id.toString());
  });

  it('9. should reject login before OTP verification and succeed after OTP verification', async () => {
    const rawOtp = '819203';
    const plainPassword = 'StrongPassword123!';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const user = await User.create({
      firstName: 'Tunde',
      lastName: 'Bakare',
      email: 'tunde@cartivamini.test',
      passwordHash,
      isEmailVerified: false,
    });

    await Otp.create({
      userId: user._id,
      email: 'tunde@cartivamini.test',
      otpHash: hashOtp(rawOtp),
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      maxAttempts: 5,
      attempts: 0,
      consumed: false,
    });

    // Attempt login before OTP verification -> Must fail with 403 Forbidden
    const unverifiedLogin = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'tunde@cartivamini.test',
        password: plainPassword,
      },
    });

    expect(unverifiedLogin.status).toBe(403);
    expect(unverifiedLogin.body.error.code).toBe('EMAIL_NOT_VERIFIED');

    // Verify OTP
    const verifyRes = await testServer.request('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: {
        email: 'tunde@cartivamini.test',
        otp: rawOtp,
        purpose: 'email_verification',
      },
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    // Attempt login after OTP verification -> Must succeed with 200 OK & JWT
    const verifiedLogin = await testServer.request('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'tunde@cartivamini.test',
        password: plainPassword,
      },
    });

    expect(verifiedLogin.status).toBe(200);
    expect(verifiedLogin.body.success).toBe(true);
    expect(verifiedLogin.body.data.accessToken).toBeDefined();
    expect(verifiedLogin.body.data.user.isEmailVerified).toBe(true);
  });
});
