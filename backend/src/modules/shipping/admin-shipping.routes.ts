import { Router } from 'express';
import { shippingController } from './shipping.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import { UserRole } from '@shared/enums.js';
import {
  createShippingConfigSchema,
  updateShippingConfigSchema,
  shippingConfigFilterSchema,
} from './shipping.validator.js';

export const adminShippingRouter = Router();

// Enforce authentication & Administrator privileges
adminShippingRouter.use(authenticate, requireRole(UserRole.ADMIN));

/**
 * GET /api/v1/admin/shipping/configurations
 * Lists all shipping configurations with optional query filters.
 */
adminShippingRouter.get(
  '/configurations',
  validateRequest({ query: shippingConfigFilterSchema }),
  asyncHandler((req, res) => shippingController.listConfigurations(req, res))
);

/**
 * GET /api/v1/admin/shipping/configurations/:id
 * Retrieves a single shipping configuration by ID.
 */
adminShippingRouter.get(
  '/configurations/:id',
  asyncHandler((req, res) => shippingController.getConfigurationById(req, res))
);

/**
 * POST /api/v1/admin/shipping/configurations
 * Creates a new shipping configuration.
 */
adminShippingRouter.post(
  '/configurations',
  validateRequest({ body: createShippingConfigSchema }),
  asyncHandler((req, res) => shippingController.createConfiguration(req, res))
);

/**
 * PATCH /api/v1/admin/shipping/configurations/:id
 * Updates an existing shipping configuration.
 */
adminShippingRouter.patch(
  '/configurations/:id',
  validateRequest({ body: updateShippingConfigSchema }),
  asyncHandler((req, res) => shippingController.updateConfiguration(req, res))
);

/**
 * PATCH /api/v1/admin/shipping/configurations/:id/status
 * Toggles the active status of a shipping configuration.
 */
adminShippingRouter.patch(
  '/configurations/:id/status',
  asyncHandler((req, res) => shippingController.toggleConfigurationStatus(req, res))
);

/**
 * DELETE /api/v1/admin/shipping/configurations/:id
 * Safely deletes a shipping configuration.
 */
adminShippingRouter.delete(
  '/configurations/:id',
  asyncHandler((req, res) => shippingController.deleteConfiguration(req, res))
);
