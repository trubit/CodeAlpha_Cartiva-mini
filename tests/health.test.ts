import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../backend/src/app.js';
import type { ApiResponse, HealthResponse } from '../shared/types/api.types.js';

describe('Health & Service Status Infrastructure (Phase 3)', () => {
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

  it('GET /api/v1/health responds with 200 OK (Liveness Probe)', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    expect(response.status).toBe(200);

    const json = (await response.json()) as ApiResponse<HealthResponse>;
    expect(json.success).toBe(true);
    expect(json.message).toBe('Service is operational.');
    expect(json.data).toBeDefined();

    const health = json.data;
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('cartiva-mini-api');
    expect(health.version).toBe('1.0.0');
    expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(health.memoryUsage).toBeDefined();
    expect(health.memoryUsage.heapUsedMB).toBeGreaterThan(0);

    // Database verification: accurately reports disconnected state when not connected
    expect(health.database.status).toBe('disconnected');
    expect(health.database.message).toBeDefined();
  });

  it('GET /api/v1/health/ready responds with 503 when dependencies are disconnected (Readiness Probe)', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health/ready`);
    expect(response.status).toBe(503);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.data).toBeDefined();
    expect(json.data.ready).toBe(false);
    expect(json.data.dependencies.database.status).toBe('disconnected');
  });

  it('GET /api/v1/docs/openapi.json serves valid OpenAPI 3.0 specification', async () => {
    const response = await fetch(`${baseUrl}/api/v1/docs/openapi.json`);
    expect(response.status).toBe(200);

    const spec = await response.json();
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toContain('Cartiva Mini');
    expect(spec.paths['/health']).toBeDefined();
  });

  it('GET /api/v1/non-existent returns 404 with standardized ApiErrorResponse', async () => {
    const response = await fetch(`${baseUrl}/api/v1/non-existent-route`);
    expect(response.status).toBe(404);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe('ROUTE_NOT_FOUND');
    expect(json.error.message).toContain('Cannot find GET /api/v1/non-existent-route');
    expect(json.error.requestId).toBeDefined();
  });
});
