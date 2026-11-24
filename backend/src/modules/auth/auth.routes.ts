import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  authRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
} from '../../middleware/rate-limit.middleware.js';
import { authController } from './auth.controller.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  sessionParamSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from './auth.validator.js';

export const authRouter = Router();

// ============================================================================
// 1. Public Authentication Routes
// ============================================================================

// Register customer account
authRouter.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  asyncHandler(authController.register)
);

// Authenticate customer (email/password)
authRouter.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  asyncHandler(authController.login)
);

// Refresh session and rotate refresh token
authRouter.post('/refresh', asyncHandler(authController.refresh));

// Logout current session
authRouter.post('/logout', asyncHandler(authController.logout));

// Verify email with 6-digit numeric OTP
authRouter.post(
  '/verify-email',
  emailVerificationRateLimiter,
  validateRequest({ body: verifyOtpSchema }),
  asyncHandler(authController.verifyOtp)
);

// Resend 6-digit numeric verification OTP
authRouter.post(
  '/resend-verification',
  emailVerificationRateLimiter,
  validateRequest({ body: resendOtpSchema }),
  asyncHandler(authController.resendOtp)
);

// Primary OTP verification endpoint
authRouter.post(
  '/verify-otp',
  emailVerificationRateLimiter,
  validateRequest({ body: verifyOtpSchema }),
  asyncHandler(authController.verifyOtp)
);

// Resend 6-digit numeric OTP with cooldown
authRouter.post(
  '/resend-otp',
  emailVerificationRateLimiter,
  validateRequest({ body: resendOtpSchema }),
  asyncHandler(authController.resendOtp)
);

// Request password reset email
authRouter.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword)
);

// Reset password with token
authRouter.post(
  '/reset-password',
  passwordResetRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword)
);

// ============================================================================
// 2. Protected Authentication & Session Routes (Requires Valid Access Token)
// ============================================================================

// Retrieve authenticated user profile
authRouter.get('/me', authenticate, asyncHandler(authController.getMe));

// Change password
authRouter.post(
  '/change-password',
  authenticate,
  validateRequest({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword)
);

// Logout all devices / sessions
authRouter.post('/logout-all', authenticate, asyncHandler(authController.logoutAll));

// List active user sessions
authRouter.get('/sessions', authenticate, asyncHandler(authController.getSessions));

// Revoke a specific session
authRouter.delete(
  '/sessions/:id',
  authenticate,
  validateRequest({ params: sessionParamSchema }),
  asyncHandler(authController.revokeSession)
);
