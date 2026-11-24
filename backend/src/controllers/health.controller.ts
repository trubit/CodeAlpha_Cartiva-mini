import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { getDatabaseStatus } from '../config/database.js';
import { sendSuccess } from '../utils/response.util.js';
import { HttpStatus } from '../constants/httpStatusCodes.js';
import type { HealthResponse } from '@shared/api.types.js';

/**
 * Health & Operational Status Controller.
 * Provides liveness and readiness probe endpoints for orchestrators and monitoring.
 */
export const healthController = {
  /**
   * GET /api/v1/health — Liveness Probe
   * Confirms the Node.js Express process is healthy, running, and accepting connections.
   */
  getLiveness: (_req: Request, res: Response): void => {
    const mem = process.memoryUsage();
    const db = getDatabaseStatus();

    const healthData: HealthResponse = {
      status: 'healthy',
      service: 'cartiva-mini-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      memoryUsage: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
      database: {
        status: db.status,
        message: db.message,
      },
    };

    sendSuccess(res, healthData, 'Service is operational.', HttpStatus.OK);
  },

  /**
   * GET /api/v1/health/ready — Readiness Probe
   * Evaluates if critical dependencies (e.g. MongoDB) are connected and ready to process traffic.
   * Accurately returns 503 while database connection is deferred to Phase 4.
   */
  getReadiness: (_req: Request, res: Response): void => {
    const db = getDatabaseStatus();
    const isReady = db.ready;

    const readinessPayload = {
      ready: isReady,
      service: 'cartiva-mini-api',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: {
          status: db.status,
          ready: db.ready,
          message: db.message,
        },
      },
    };

    if (isReady) {
      sendSuccess(
        res,
        readinessPayload,
        'All critical services are ready for traffic.',
        HttpStatus.OK
      );
    } else {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Service is starting up or critical dependencies are disconnected.',
        data: readinessPayload,
      });
    }
  },
};
