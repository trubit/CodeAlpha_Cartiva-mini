import type { Request, Response } from 'express';
import { productService } from './product.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.util.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { HttpStatus } from '../../constants/httpStatusCodes.js';

class ProductController {
  // Public
  public async getPublicProducts(req: Request, res: Response): Promise<void> {
    const result = await productService.getPublicProducts(req.query);
    sendSuccess(
      res,
      result.products,
      'Products retrieved successfully.',
      HttpStatus.OK,
      result.pagination
    );
  }

  public async getPublicProductBySlug(req: Request, res: Response): Promise<void> {
    const slug = req.params.slug!;
    const product = await productService.getPublicProductBySlug(slug);
    sendSuccess(res, product, 'Product details retrieved successfully.');
  }

  public async getFeaturedProducts(req: Request, res: Response): Promise<void> {
    const limit = parseInt(req.query.limit as string, 10) || 8;
    const products = await productService.getFeaturedProducts(limit);
    sendSuccess(res, products, 'Featured products retrieved successfully.');
  }

  public async getRelatedProducts(req: Request, res: Response): Promise<void> {
    const slug = req.params.slug!;
    const limit = parseInt(req.query.limit as string, 10) || 4;
    const products = await productService.getRelatedProducts(slug, limit);
    sendSuccess(res, products, 'Related products retrieved successfully.');
  }

  public async searchProducts(req: Request, res: Response): Promise<void> {
    const context = {
      userId: req.user?.userId,
      sessionId: req.headers['x-session-id'] as string | undefined,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    const result = await productService.searchProducts(req.query, context);
    sendSuccess(
      res,
      {
        products: result.products,
        facets: result.facets,
        query: result.query,
      },
      'Search results retrieved successfully.',
      HttpStatus.OK,
      result.pagination
    );
  }

  public async getSuggestions(req: Request, res: Response): Promise<void> {
    const query = (req.query.q as string) || '';
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const suggestions = await productService.getSuggestions(query, limit);
    sendSuccess(res, suggestions, 'Search suggestions retrieved successfully.');
  }

  public async getNewArrivals(req: Request, res: Response): Promise<void> {
    const limit = parseInt(req.query.limit as string, 10) || 8;
    const products = await productService.getNewArrivals(limit);
    sendSuccess(res, products, 'New arrivals retrieved successfully.');
  }

  public async getCategoryProducts(req: Request, res: Response): Promise<void> {
    const slug = req.params.slug!;
    const result = await productService.getCategoryProducts(slug, req.query);
    sendSuccess(
      res,
      result.products,
      'Category products retrieved successfully.',
      HttpStatus.OK,
      result.pagination
    );
  }

  // Admin
  public async createProduct(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const created = await productService.createProduct(adminId, req.body, context);
    sendCreated(res, created, 'Product created successfully.');
  }

  public async getAdminProducts(req: Request, res: Response): Promise<void> {
    const result = await productService.getAdminProducts(req.query);
    sendSuccess(
      res,
      result.products,
      'Admin products retrieved successfully.',
      HttpStatus.OK,
      result.pagination
    );
  }

  public async getAdminProductById(req: Request, res: Response): Promise<void> {
    const productId = req.params.productId!;
    const product = await productService.getAdminProductById(productId);
    sendSuccess(res, product, 'Admin product details retrieved successfully.');
  }

  public async updateProduct(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const productId = req.params.productId!;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const updated = await productService.updateProduct(adminId, productId, req.body, context);
    sendSuccess(res, updated, 'Product updated successfully.');
  }

  public async updateProductStatus(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const productId = req.params.productId!;
    const { status } = req.body;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const updated = await productService.updateProductStatus(adminId, productId, status, context);
    sendSuccess(res, updated, 'Product status updated successfully.');
  }

  public async deleteProduct(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const productId = req.params.productId!;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    await productService.deleteOrArchiveProduct(adminId, productId, context);
    sendSuccess(res, null, 'Product archived successfully.');
  }

  public async uploadProductImage(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const productId = req.params.productId!;
    const file = req.file;

    if (!file) {
      throw AppError.badRequest('No image file uploaded.', ErrorCodes.VALIDATION_ERROR);
    }

    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const isThumbnail =
      req.body.isThumbnail !== undefined
        ? req.body.isThumbnail === 'true' || req.body.isThumbnail === true
        : undefined;
    const displayOrder = req.body.displayOrder ? parseInt(req.body.displayOrder, 10) : undefined;
    const alt = req.body.alt as string | undefined;

    const updated = await productService.uploadProductImage(
      adminId,
      productId,
      file.buffer,
      file.mimetype,
      { isThumbnail, displayOrder, alt },
      context
    );

    sendSuccess(res, updated, 'Product image uploaded successfully.');
  }

  public async removeProductImage(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const productId = req.params.productId!;
    const imageId = req.params.imageId!;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };

    const updated = await productService.removeProductImage(adminId, productId, imageId, context);
    sendSuccess(res, updated, 'Product image removed successfully.');
  }

  public async setPrimaryProductImage(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const productId = req.params.productId!;
    const { imageId } = req.body;

    if (!imageId) {
      throw AppError.badRequest('Image identifier is required.', ErrorCodes.VALIDATION_ERROR);
    }

    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const updated = await productService.setPrimaryProductImage(
      adminId,
      productId,
      imageId,
      context
    );
    sendSuccess(res, updated, 'Primary product image set successfully.');
  }
}

export const productController = new ProductController();
