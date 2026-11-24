import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Application } from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { validateRequest } from '../backend/src/middleware/validation.middleware.js';
import { errorHandler } from '../backend/src/middleware/error.middleware.js';
import { requestIdMiddleware } from '../backend/src/middleware/request-id.middleware.js';
import {
  paginationQuerySchema,
  objectIdParamSchema,
} from '../backend/src/validators/common.validator.js';
import { sendSuccess } from '../backend/src/utils/response.util.js';

describe('Request Validation Middleware Infrastructure', () => {
  let app: Application;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(requestIdMiddleware);
    app.use(express.json());

    // Test endpoint using paginationQuerySchema
    app.get('/test/paginate', validateRequest({ query: paginationQuerySchema }), (req, res) => {
      sendSuccess(res, { query: req.query }, 'Validated successfully.');
    });

    // Test endpoint using objectIdParamSchema
    app.get('/test/resource/:id', validateRequest({ params: objectIdParamSchema }), (req, res) => {
      sendSuccess(res, { id: req.params.id }, 'Resource validated.');
    });

    app.use(errorHandler);

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

  it('accepts valid query parameters and applies defaults', async () => {
    const response = await fetch(`${baseUrl}/test/paginate?page=2&limit=50&sortOrder=asc`);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.query.page).toBe(2);
    expect(json.data.query.limit).toBe(50);
    expect(json.data.query.sortOrder).toBe('asc');
  });

  it('rejects invalid query parameters with 422 Unprocessable Entity and structured field errors', async () => {
    const response = await fetch(`${baseUrl}/test/paginate?page=-5&limit=9999`);
    expect(response.status).toBe(422);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details).toBeInstanceOf(Array);
    expect(json.error.details.length).toBeGreaterThan(0);

    const fields = json.error.details.map((d: { field: string }) => d.field);
    expect(fields).toContain('page');
    expect(fields).toContain('limit');
  });

  it('accepts valid 24-character hexadecimal MongoDB ObjectId', async () => {
    const validId = '507f1f77bcf86cd799439011';
    const response = await fetch(`${baseUrl}/test/resource/${validId}`);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(validId);
  });

  it('rejects invalid MongoDB ObjectId format with 422 Unprocessable Entity', async () => {
    const invalidId = 'not-a-valid-hex-id';
    const response = await fetch(`${baseUrl}/test/resource/${invalidId}`);
    expect(response.status).toBe(422);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details[0].field).toBe('id');
  });
});
