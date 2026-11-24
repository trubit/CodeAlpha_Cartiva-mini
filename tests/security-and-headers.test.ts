import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../backend/src/app.js';

describe('Security Headers, CORS & Correlation ID Infrastructure', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('includes essential Helmet security headers in HTTP responses', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-xss-protection')).toBe('0');
  });

  it('generates a new unique X-Request-ID when not provided by client', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const requestId = response.headers.get('x-request-id');
    expect(requestId).toBeDefined();
    expect(requestId?.length).toBeGreaterThanOrEqual(16);
  });

  it('preserves client-provided X-Request-ID correlation header', async () => {
    const clientTraceId = 'cartiva-trace-uuid-123456';
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: {
        'x-request-id': clientTraceId,
      },
    });
    expect(response.headers.get('x-request-id')).toBe(clientTraceId);
  });

  it('handles malformed JSON body with 400 Bad Request and MALFORMED_JSON code', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{"invalidJson": unquoted}',
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('MALFORMED_JSON');
    expect(json.error.message).toContain('malformed JSON syntax');
  });
});
