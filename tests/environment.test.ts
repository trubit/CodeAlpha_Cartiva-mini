import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { env } from '../backend/src/config/env.js';

describe('Environment Configuration Validation (Zod)', () => {
  it('correctly validates the current active environment configuration', () => {
    expect(env).toBeDefined();
    expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
    expect(env.PORT).toBeGreaterThan(0);
    expect(env.FRONTEND_URL).toBeDefined();
    expect(env.BACKEND_URL).toBeDefined();
    expect(env.MONGODB_URI).toBeDefined();
    expect(env.JWT_ACCESS_SECRET.length).toBeGreaterThanOrEqual(16);
    expect(env.JWT_REFRESH_SECRET.length).toBeGreaterThanOrEqual(16);
  });

  it('rejects invalid PORT and NODE_ENV values in schema', () => {
    const testSchema = z.object({
      NODE_ENV: z.enum(['development', 'production', 'test']),
      PORT: z.coerce.number().int().min(1000).max(65535),
      JWT_ACCESS_SECRET: z.string().min(16),
    });

    const invalidEnv = {
      NODE_ENV: 'invalid_mode',
      PORT: 'not-a-port',
      JWT_ACCESS_SECRET: 'short',
    };

    const result = testSchema.safeParse(invalidEnv);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issueFields = result.error.issues.map((i) => i.path[0]);
      expect(issueFields).toContain('NODE_ENV');
      expect(issueFields).toContain('PORT');
      expect(issueFields).toContain('JWT_ACCESS_SECRET');
    }
  });
});
