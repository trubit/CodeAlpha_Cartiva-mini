import type { CookieOptions } from 'express';
import { env } from '../../config/env.js';

export const AUTH_CONSTANTS = {
  BCRYPT_SALT_ROUNDS: 12,
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  REFRESH_TOKEN_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,
  VERIFICATION_TOKEN_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET_TOKEN_EXPIRY_MS: (env.OTP_EXPIRATION_MINUTES || 30) * 60 * 1000,
  MAX_FAILED_LOGIN_ATTEMPTS: env.OTP_MAX_ATTEMPTS || 5,
  OTP_RESEND_COOLDOWN_MS: (env.OTP_RESEND_COOLDOWN_SECONDS || 60) * 1000,
  LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  REFRESH_COOKIE_NAME: 'cartiva_refresh_token',
} as const;

export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_MS,
};

export const CLEAR_REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};
