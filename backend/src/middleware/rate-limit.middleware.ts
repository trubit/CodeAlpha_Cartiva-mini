import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { HttpStatus } from '../constants/httpStatusCodes.js';
import { ErrorCodes } from '../constants/errorCodes.js';

/**
 * Standard API rate limiter.
 * Limits general API traffic to prevent denial-of-service and brute force abuse.
 */
export const standardRateLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: env.NODE_ENV === 'test' ? 1000 : 120, // 120 requests/minute in normal operation
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
  message: {
    success: false,
    error: {
      code: ErrorCodes.TOO_MANY_REQUESTS,
      message: 'Too many requests. Please slow down and try again shortly.',
      timestamp: new Date().toISOString(),
    },
  },
});

/**
 * Strict rate limiter for sensitive endpoints (e.g. checkout, coupon validation).
 */
export const strictRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: env.NODE_ENV === 'test' ? 500 : 20, // 20 requests/15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
  message: {
    success: false,
    error: {
      code: ErrorCodes.TOO_MANY_REQUESTS,
      message: 'Rate limit exceeded for sensitive operation. Please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
});

/**
 * Authentication rate limiter for login and registration endpoints.
 * Mitigates credential stuffing and brute-force attacks.
 */
export const authRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: env.NODE_ENV === 'test' ? 1000 : 15, // 15 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
  message: {
    success: false,
    error: {
      code: ErrorCodes.TOO_MANY_REQUESTS,
      message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
      timestamp: new Date().toISOString(),
    },
  },
});

/**
 * Strict rate limiter for password recovery requests.
 */
export const passwordResetRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: env.NODE_ENV === 'test' ? 1000 : 5, // 5 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
  message: {
    success: false,
    error: {
      code: ErrorCodes.TOO_MANY_REQUESTS,
      message: 'Too many password reset requests. Please try again in 15 minutes.',
      timestamp: new Date().toISOString(),
    },
  },
});

/**
 * Rate limiter for email verification links.
 */
export const emailVerificationRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: env.NODE_ENV === 'test' ? 1000 : 5, // 5 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
  message: {
    success: false,
    error: {
      code: ErrorCodes.TOO_MANY_REQUESTS,
      message:
        'Too many email verification requests. Please wait 15 minutes before requesting another.',
      timestamp: new Date().toISOString(),
    },
  },
});
