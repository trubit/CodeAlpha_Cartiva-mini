/**
 * Cartiva Mini — Administrator Platform Settings Routes
 * Mounted at /api/v1/admin/settings
 */
import { Router } from 'express';
import { settingsController } from './settings.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { updatePlatformSettingsSchema } from './settings.validator.js';
import { UserRole } from '@shared/enums.js';

export const adminSettingsRouter = Router();

// Strictly guarded by Admin role (Staff cannot alter store configurations or policies)
adminSettingsRouter.use(authenticate, requireRole(UserRole.ADMIN));

adminSettingsRouter.get(
  '/',
  asyncHandler((req, res) => settingsController.getAdminSettings(req, res))
);

adminSettingsRouter.patch(
  '/',
  validateRequest({ body: updatePlatformSettingsSchema }),
  asyncHandler((req, res) => settingsController.updateSettings(req, res))
);
