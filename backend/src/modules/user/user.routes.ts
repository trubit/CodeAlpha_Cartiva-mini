import { Router } from 'express';
import multer from 'multer';
import { userController } from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import {
  authRateLimiter,
  emailVerificationRateLimiter,
} from '../../middleware/rate-limit.middleware.js';
import {
  updateProfileSchema,
  createAddressSchema,
  updateAddressSchema,
  requestEmailChangeSchema,
  verifyEmailChangeSchema,
  deactivationRequestSchema,
  deletionRequestSchema,
} from './user.validator.js';
import { MAX_AVATAR_SIZE_BYTES } from './user.constants.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
});

export const userRouter = Router();

// ============================================================================
// 1. Customer Profile
// ============================================================================

userRouter.get(
  '/me',
  authenticate,
  asyncHandler((req, res) => userController.getProfile(req, res))
);

userRouter.patch(
  '/me',
  authenticate,
  validateRequest({ body: updateProfileSchema }),
  asyncHandler((req, res) => userController.updateProfile(req, res))
);

// ============================================================================
// 2. Avatar Management
// ============================================================================

userRouter.post(
  '/me/avatar',
  authenticate,
  upload.single('avatar'),
  asyncHandler((req, res) => userController.uploadAvatar(req, res))
);

userRouter.delete(
  '/me/avatar',
  authenticate,
  asyncHandler((req, res) => userController.deleteAvatar(req, res))
);

// ============================================================================
// 3. Customer Dashboard Summary
// ============================================================================

userRouter.get(
  '/me/dashboard',
  authenticate,
  asyncHandler((req, res) => userController.getDashboardSummary(req, res))
);

// ============================================================================
// 4. Delivery Addresses
// ============================================================================

userRouter.get(
  '/me/addresses',
  authenticate,
  asyncHandler((req, res) => userController.getAddresses(req, res))
);

userRouter.post(
  '/me/addresses',
  authenticate,
  validateRequest({ body: createAddressSchema }),
  asyncHandler((req, res) => userController.createAddress(req, res))
);

userRouter.patch(
  '/me/addresses/:addressId',
  authenticate,
  validateRequest({ body: updateAddressSchema }),
  asyncHandler((req, res) => userController.updateAddress(req, res))
);

userRouter.delete(
  '/me/addresses/:addressId',
  authenticate,
  asyncHandler((req, res) => userController.deleteAddress(req, res))
);

userRouter.patch(
  '/me/addresses/:addressId/default',
  authenticate,
  asyncHandler((req, res) => userController.setDefaultAddress(req, res))
);

// ============================================================================
// 5. Email Change Workflow
// ============================================================================

userRouter.post(
  '/me/email-change',
  authenticate,
  emailVerificationRateLimiter,
  validateRequest({ body: requestEmailChangeSchema }),
  asyncHandler((req, res) => userController.requestEmailChange(req, res))
);

userRouter.post(
  '/me/email-change/verify',
  emailVerificationRateLimiter,
  validateRequest({ body: verifyEmailChangeSchema }),
  asyncHandler((req, res) => userController.verifyEmailChange(req, res))
);

userRouter.post(
  '/me/email-change/resend',
  authenticate,
  emailVerificationRateLimiter,
  asyncHandler((req, res) => userController.resendEmailChange(req, res))
);

// ============================================================================
// 6. Account Deactivation & Deletion
// ============================================================================

userRouter.post(
  '/me/deactivation-request',
  authenticate,
  authRateLimiter,
  validateRequest({ body: deactivationRequestSchema }),
  asyncHandler((req, res) => userController.requestDeactivation(req, res))
);

userRouter.post(
  '/me/deletion-request',
  authenticate,
  authRateLimiter,
  validateRequest({ body: deletionRequestSchema }),
  asyncHandler((req, res) => userController.requestDeletion(req, res))
);

userRouter.get(
  '/me/deletion-request',
  authenticate,
  asyncHandler((req, res) => userController.getDeletionStatus(req, res))
);
