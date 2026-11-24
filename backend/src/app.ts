import express, { type Application } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { helmetSecurity, corsSecurity } from './middleware/security.middleware.js';
import { standardRateLimiter } from './middleware/rate-limit.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { tenantMiddleware } from './middleware/tenant.middleware.js';
import { requestLogger } from './middleware/logger.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { apiRouter } from './routes/index.js';

/**
 * Express Application Factory.
 * Assembles middleware pipeline in strict security, observability, and routing order.
 */
export const createApp = (): Application => {
  const app = express();

  // 1. Reverse proxy trust configuration (Nginx, Docker, load balancers)
  app.set('trust proxy', 1);

  // 2. Correlation ID & Tenant Context injection
  app.use(requestIdMiddleware);
  app.use(tenantMiddleware);

  // 3. Security HTTP headers and CORS policy
  app.use(helmetSecurity);
  app.use(corsSecurity);

  // 4. Rate Limiting for general API endpoints
  app.use('/api', standardRateLimiter);

  // 5. Body Parsing with strict size limits and raw buffer retention for cryptographic webhook verification (HMAC SHA512)
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // 6. Request timing and structured diagnostic logging
  app.use(requestLogger);

  // Statically serve uploads boundary for local media fallbacks (product photos and avatars)
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // 7. Mount Versioned API Router (/api/v1)
  app.use('/api/v1', apiRouter);

  // 8. 404 Not Found Middleware for unmapped routes
  app.use(notFoundMiddleware);

  // 9. Centralized Error Handling Middleware (Catches AppError, Zod, and system errors)
  app.use(errorHandler);

  return app;
};
