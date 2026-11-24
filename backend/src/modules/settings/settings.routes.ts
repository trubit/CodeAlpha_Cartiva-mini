/**
 * Cartiva Mini — Public Platform Settings Routes
 * Mounted at /api/v1/settings
 */
import { Router } from 'express';
import { settingsController } from './settings.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';

export const settingsRouter = Router();

// Public storefront configuration
settingsRouter.get(
  '/',
  asyncHandler((req, res) => settingsController.getPublicSettings(req, res))
);
