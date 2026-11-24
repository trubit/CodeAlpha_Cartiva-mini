import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

/**
 * Cartiva Mini — 404 Route Not Found Middleware
 * Intercepts requests to unregistered endpoints and forwards a standardized AppError.
 */
export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(
    new AppError(
      `Cannot find ${req.method} ${req.originalUrl} on this server.`,
      404,
      ErrorCodes.ROUTE_NOT_FOUND
    )
  );
};
