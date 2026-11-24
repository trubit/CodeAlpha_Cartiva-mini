import { Router } from 'express';
import { inventoryController } from './inventory.controller.js';
import {
  authenticate,
  requireRole,
  optionalAuthenticate,
} from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import {
  initializeInventorySchema,
  receiveStockSchema,
  deductStockSchema,
  adjustStockSchema,
  updateThresholdSchema,
  createReservationSchema,
  inventoryQuerySchema,
  movementQuerySchema,
} from './inventory.validator.js';
import { UserRole } from '@shared/enums.js';

// ============================================================================
// Administrative Inventory Routes (/api/v1/admin/inventory)
// ============================================================================
export const adminInventoryRouter = Router();

// Enforce strict administrative authorization across all admin inventory endpoints
adminInventoryRouter.use(authenticate, requireRole(UserRole.ADMIN));

adminInventoryRouter.get(
  '/',
  validateRequest({ query: inventoryQuerySchema }),
  asyncHandler((req, res) => inventoryController.getInventoryList(req, res))
);

adminInventoryRouter.get(
  '/summary',
  asyncHandler((req, res) => inventoryController.getInventorySummary(req, res))
);

adminInventoryRouter.get(
  '/low-stock',
  validateRequest({ query: inventoryQuerySchema }),
  asyncHandler((req, res) => inventoryController.getLowStock(req, res))
);

adminInventoryRouter.get(
  '/out-of-stock',
  validateRequest({ query: inventoryQuerySchema }),
  asyncHandler((req, res) => inventoryController.getOutOfStock(req, res))
);

adminInventoryRouter.get(
  '/movements',
  validateRequest({ query: movementQuerySchema }),
  asyncHandler((req, res) => inventoryController.getAllMovements(req, res))
);

adminInventoryRouter.get(
  '/:inventoryId',
  asyncHandler((req, res) => inventoryController.getInventoryDetail(req, res))
);

adminInventoryRouter.get(
  '/:inventoryId/movements',
  validateRequest({ query: movementQuerySchema }),
  asyncHandler((req, res) => inventoryController.getInventoryMovements(req, res))
);

adminInventoryRouter.post(
  '/:inventoryId/initialize',
  validateRequest({ body: initializeInventorySchema }),
  asyncHandler((req, res) => inventoryController.initializeStock(req, res))
);

adminInventoryRouter.post(
  '/:inventoryId/receive',
  validateRequest({ body: receiveStockSchema }),
  asyncHandler((req, res) => inventoryController.receiveStock(req, res))
);

adminInventoryRouter.post(
  '/:inventoryId/adjust',
  validateRequest({ body: adjustStockSchema }),
  asyncHandler((req, res) => inventoryController.adjustStock(req, res))
);

adminInventoryRouter.post(
  '/:inventoryId/deduct',
  validateRequest({ body: deductStockSchema }),
  asyncHandler((req, res) => inventoryController.deductStock(req, res))
);

adminInventoryRouter.patch(
  '/:inventoryId/threshold',
  validateRequest({ body: updateThresholdSchema }),
  asyncHandler((req, res) => inventoryController.updateThreshold(req, res))
);

// ============================================================================
// Reservation Foundation Routes (/api/v1/inventory/reservations)
// ============================================================================
export const inventoryReservationRouter = Router();

inventoryReservationRouter.post(
  '/',
  optionalAuthenticate,
  validateRequest({ body: createReservationSchema }),
  asyncHandler((req, res) => inventoryController.createReservation(req, res))
);

inventoryReservationRouter.get(
  '/:reservationId',
  asyncHandler((req, res) => inventoryController.getReservation(req, res))
);

inventoryReservationRouter.post(
  '/:reservationId/release',
  asyncHandler((req, res) => inventoryController.releaseReservation(req, res))
);
