import { Router } from 'express';
import { adminUserController } from './admin-user.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import {
  adminUpdateUserStatusSchema,
  adminCreateStaffSchema,
  adminUpdateStaffRoleSchema,
  adminReviewDeletionRequestSchema,
} from './user.validator.js';
import { UserRole } from '@shared/enums.js';

export const adminUserRouter = Router();

// Enforce authentication and strict Administrator authorization
adminUserRouter.use(authenticate, requireRole(UserRole.ADMIN));

// Staff and Team management
adminUserRouter.get(
  '/staff',
  asyncHandler((req, res) => adminUserController.listStaff(req, res))
);

adminUserRouter.post(
  '/staff',
  validateRequest({ body: adminCreateStaffSchema }),
  asyncHandler((req, res) => adminUserController.createStaff(req, res))
);

adminUserRouter.get(
  '/',
  asyncHandler((req, res) => adminUserController.getUsers(req, res))
);

adminUserRouter.get(
  '/:userId',
  asyncHandler((req, res) => adminUserController.getUserDetail(req, res))
);

adminUserRouter.patch(
  '/:userId/status',
  validateRequest({ body: adminUpdateUserStatusSchema }),
  asyncHandler((req, res) => adminUserController.updateUserStatus(req, res))
);

adminUserRouter.patch(
  '/:userId/role',
  validateRequest({ body: adminUpdateStaffRoleSchema }),
  asyncHandler((req, res) => adminUserController.updateStaffRole(req, res))
);

adminUserRouter.patch(
  '/:userId/deletion-request',
  validateRequest({ body: adminReviewDeletionRequestSchema }),
  asyncHandler((req, res) => adminUserController.reviewDeletionRequest(req, res))
);

