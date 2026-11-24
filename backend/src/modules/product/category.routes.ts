import { Router } from 'express';
import { categoryController } from './category.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryStatusSchema,
  productQuerySchema,
} from './product.validator.js';
import { productController } from './product.controller.js';
import { UserRole } from '@shared/enums.js';

// ============================================================================
// Public Category Routes (/api/v1/categories)
// ============================================================================
export const categoryRouter = Router();

categoryRouter.get(
  '/',
  asyncHandler((req, res) => categoryController.getPublicCategories(req, res))
);

categoryRouter.get(
  '/:slug',
  asyncHandler((req, res) => categoryController.getPublicCategoryBySlug(req, res))
);

categoryRouter.get(
  '/:slug/products',
  validateRequest({ query: productQuerySchema }),
  asyncHandler((req, res) => productController.getCategoryProducts(req, res))
);

// ============================================================================
// Admin Category Routes (/api/v1/admin/categories)
// ============================================================================
export const adminCategoryRouter = Router();

// Enforce authentication & Administrator role
adminCategoryRouter.use(authenticate, requireRole(UserRole.ADMIN));

adminCategoryRouter.post(
  '/',
  validateRequest({ body: createCategorySchema }),
  asyncHandler((req, res) => categoryController.createCategory(req, res))
);

adminCategoryRouter.get(
  '/',
  asyncHandler((req, res) => categoryController.getAdminCategories(req, res))
);

adminCategoryRouter.get(
  '/:categoryId',
  asyncHandler((req, res) => categoryController.getAdminCategoryById(req, res))
);

adminCategoryRouter.patch(
  '/:categoryId',
  validateRequest({ body: updateCategorySchema }),
  asyncHandler((req, res) => categoryController.updateCategory(req, res))
);

adminCategoryRouter.patch(
  '/:categoryId/status',
  validateRequest({ body: categoryStatusSchema }),
  asyncHandler((req, res) => categoryController.updateCategoryStatus(req, res))
);

adminCategoryRouter.delete(
  '/:categoryId',
  asyncHandler((req, res) => categoryController.deleteCategory(req, res))
);
