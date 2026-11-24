import { Router } from 'express';
import multer from 'multer';
import { productController } from './product.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.util.js';
import {
  createProductSchema,
  updateProductSchema,
  productStatusSchema,
  productQuerySchema,
  productSearchSchema,
  productSuggestionSchema,
} from './product.validator.js';
import { MAX_PRODUCT_IMAGE_SIZE_BYTES } from './product.constants.js';
import { UserRole } from '@shared/enums.js';

// Multer memory storage for product image processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PRODUCT_IMAGE_SIZE_BYTES,
  },
});

// ============================================================================
// Public Product Routes (/api/v1/products)
// ============================================================================
export const productRouter = Router();

productRouter.get(
  '/',
  validateRequest({ query: productQuerySchema }),
  asyncHandler((req, res) => productController.getPublicProducts(req, res))
);

productRouter.get(
  '/search',
  validateRequest({ query: productSearchSchema }),
  asyncHandler((req, res) => productController.searchProducts(req, res))
);

productRouter.get(
  '/suggestions',
  validateRequest({ query: productSuggestionSchema }),
  asyncHandler((req, res) => productController.getSuggestions(req, res))
);

productRouter.get(
  '/featured',
  asyncHandler((req, res) => productController.getFeaturedProducts(req, res))
);

productRouter.get(
  '/new-arrivals',
  asyncHandler((req, res) => productController.getNewArrivals(req, res))
);

productRouter.get(
  '/:slug',
  asyncHandler((req, res) => productController.getPublicProductBySlug(req, res))
);

productRouter.get(
  '/:slug/related',
  asyncHandler((req, res) => productController.getRelatedProducts(req, res))
);

// ============================================================================
// Admin Product Routes (/api/v1/admin/products)
// ============================================================================
export const adminProductRouter = Router();

// Enforce authentication & Administrator role
adminProductRouter.use(authenticate, requireRole(UserRole.ADMIN));

adminProductRouter.post(
  '/',
  validateRequest({ body: createProductSchema }),
  asyncHandler((req, res) => productController.createProduct(req, res))
);

adminProductRouter.get(
  '/',
  validateRequest({ query: productQuerySchema }),
  asyncHandler((req, res) => productController.getAdminProducts(req, res))
);

adminProductRouter.get(
  '/:productId',
  asyncHandler((req, res) => productController.getAdminProductById(req, res))
);

adminProductRouter.patch(
  '/:productId',
  validateRequest({ body: updateProductSchema }),
  asyncHandler((req, res) => productController.updateProduct(req, res))
);

adminProductRouter.patch(
  '/:productId/status',
  validateRequest({ body: productStatusSchema }),
  asyncHandler((req, res) => productController.updateProductStatus(req, res))
);

adminProductRouter.delete(
  '/:productId',
  asyncHandler((req, res) => productController.deleteProduct(req, res))
);

// Product Image Management Endpoints
adminProductRouter.post(
  '/:productId/images',
  upload.single('image'),
  asyncHandler((req, res) => productController.uploadProductImage(req, res))
);

adminProductRouter.delete(
  '/:productId/images/:imageId',
  asyncHandler((req, res) => productController.removeProductImage(req, res))
);

adminProductRouter.patch(
  '/:productId/images/primary',
  asyncHandler((req, res) => productController.setPrimaryProductImage(req, res))
);
