import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../../backend/src/app.js';
import { connectDatabase, disconnectDatabase } from '../../backend/src/config/database.js';
import { User } from '../../backend/src/models/User.model.js';
import { UserRole } from '@shared/enums.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';

const TEST_DB_URI = 'mongodb://localhost:27017/cartiva-mini-auth-reg-test';

describe('Authentication — Customer Registration (/api/v1/auth/register)', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    await connectDatabase(TEST_DB_URI);
    await User.init();
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
  });

  it('should successfully register a customer account with valid data', async () => {
    const payload = {
      firstName: 'Adaora',
      lastName: 'Okonkwo',
      email: 'adaora.okonkwo@cartivamini.test',
      password: 'StrongP@ssword123!',
      confirmPassword: 'StrongP@ssword123!',
      phone: '+2348012345678',
    };

    const res = await testServer.request('/api/v1/auth/register', {
      method: 'POST',
      body: payload,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(payload.email);
    expect(res.body.data.firstName).toBe(payload.firstName);
    expect(res.body.data.lastName).toBe(payload.lastName);
    expect(res.body.data.role).toBe(UserRole.CUSTOMER);
    expect(res.body.data.isEmailVerified).toBe(false);

    // Verify password is NOT exposed in response
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.passwordHash).toBeUndefined();

    // Verify user in MongoDB
    const persisted = await User.findOne({ email: payload.email }).select('+passwordHash');
    expect(persisted).toBeDefined();
    expect(persisted!.passwordHash).not.toBe(payload.password);
    expect(persisted!.passwordHash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash format
  });

  it('should reject registration if email is already in use', async () => {
    const payload = {
      firstName: 'Adaora',
      lastName: 'Okonkwo',
      email: 'adaora.duplicate@cartivamini.test',
      password: 'StrongP@ssword123!',
      confirmPassword: 'StrongP@ssword123!',
    };

    // First registration
    const firstRes = await testServer.request('/api/v1/auth/register', {
      method: 'POST',
      body: payload,
    });
    expect(firstRes.status).toBe(201);

    // Duplicate attempt
    const res = await testServer.request('/api/v1/auth/register', {
      method: 'POST',
      body: payload,
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('USER_ALREADY_EXISTS');
  });

  it('should reject registration with invalid email format', async () => {
    const payload = {
      firstName: 'Adaora',
      lastName: 'Okonkwo',
      email: 'not-an-email',
      password: 'StrongP@ssword123!',
      confirmPassword: 'StrongP@ssword123!',
    };

    const res = await testServer.request('/api/v1/auth/register', {
      method: 'POST',
      body: payload,
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject registration with a weak password', async () => {
    const payload = {
      firstName: 'Adaora',
      lastName: 'Okonkwo',
      email: 'weak.password@cartivamini.test',
      password: 'simple',
      confirmPassword: 'simple',
    };

    const res = await testServer.request('/api/v1/auth/register', {
      method: 'POST',
      body: payload,
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject mismatched password confirmation', async () => {
    const payload = {
      firstName: 'Adaora',
      lastName: 'Okonkwo',
      email: 'mismatch@cartivamini.test',
      password: 'StrongP@ssword123!',
      confirmPassword: 'DifferentP@ssword123!',
    };

    const res = await testServer.request('/api/v1/auth/register', {
      method: 'POST',
      body: payload,
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should prevent mass assignment of administrator role during registration', async () => {
    const payload = {
      firstName: 'Malicious',
      lastName: 'Actor',
      email: 'escalate@cartivamini.test',
      password: 'StrongP@ssword123!',
      confirmPassword: 'StrongP@ssword123!',
      role: 'admin',
    };

    const res = await testServer.request('/api/v1/auth/register', {
      method: 'POST',
      body: payload,
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
