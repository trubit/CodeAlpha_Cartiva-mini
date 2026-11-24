import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

/**
 * Cartiva Mini — HTTP Request & Audit Logger Middleware
 * Logs incoming HTTP requests and response durations without logging sensitive headers or payload fields.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime();
  const requestId = (req.headers['x-request-id'] as string) || 'unassigned';

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const durationMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);

    const logPayload = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: `${durationMs}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent') || 'unknown',
    };

    if (res.statusCode >= 500) {
      logger.error(
        logPayload,
        `HTTP ${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`
      );
    } else if (res.statusCode >= 400) {
      logger.warn(
        logPayload,
        `HTTP ${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`
      );
    } else {
      logger.info(
        logPayload,
        `HTTP ${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`
      );
    }
  });

  next();
};
