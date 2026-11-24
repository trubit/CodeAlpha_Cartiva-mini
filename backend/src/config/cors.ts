import type { CorsOptions } from 'cors';
import { env } from './env.js';

/**
 * Cartiva Mini — CORS Configuration
 * Enforces strict origin allowlists in production while supporting local development.
 */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, curl, tests) where origin is undefined
    if (!origin) {
      return callback(null, true);
    }

    // In development or test, allow the configured frontend URL and standard localhost origins
    if (env.NODE_ENV !== 'production') {
      const allowedDevOrigins = [
        env.FRONTEND_URL,
        'http://localhost:5180',
        'http://127.0.0.1:5180',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
      ];
      if (allowedDevOrigins.includes(origin)) {
        return callback(null, true);
      }
    }

    // In production, strictly enforce exact match against configured FRONTEND_URL
    if (origin === env.FRONTEND_URL) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for untrusted origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 hours preflight cache
};
