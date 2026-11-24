import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus,
} from '../backend/src/config/database.js';
import { createApp } from '../backend/src/app.js';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

describe('MongoDB Connection & Health Readiness Integration', () => {
  const TEST_URI = 'mongodb://localhost:27017/cartiva-mini-conn-test';
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
    await disconnectDatabase();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('connects to real MongoDB and updates database status to connected', async () => {
    await connectDatabase(TEST_URI);
    const dbStatus = getDatabaseStatus();

    expect(dbStatus.status).toBe('connected');
    expect(dbStatus.ready).toBe(true);
    expect(dbStatus.message).toContain('active');
  });

  it('GET /api/v1/health/ready responds with 200 OK when database is connected', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health/ready`);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.ready).toBe(true);
    expect(json.data.dependencies.database.status).toBe('connected');
  });

  it('GET /api/v1/health liveness probe accurately reports connected database status', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.database.status).toBe('connected');
  });

  it('disconnectDatabase cleanly disconnects and updates readiness probe to 503', async () => {
    await disconnectDatabase();
    const dbStatus = getDatabaseStatus();

    expect(dbStatus.status).toBe('disconnected');
    expect(dbStatus.ready).toBe(false);

    const response = await fetch(`${baseUrl}/api/v1/health/ready`);
    expect(response.status).toBe(503);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.data.ready).toBe(false);
  });
});
