import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Cartiva Mini — Request ID Middleware
 * Assigns or preserves a unique correlation ID (UUIDv4) for every incoming request.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = req.headers['x-request-id'];
  const requestId =
    typeof existingId === 'string' && existingId.trim().length > 0
      ? existingId
      : crypto.randomUUID();

  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
};
