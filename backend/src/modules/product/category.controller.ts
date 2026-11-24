import type { Request, Response } from 'express';
import { categoryService } from './category.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.util.js';

class CategoryController {
  // Public
  public async getPublicCategories(_req: Request, res: Response): Promise<void> {
    const categories = await categoryService.getPublicCategories();
    sendSuccess(res, categories, 'Categories retrieved successfully.');
  }

  public async getPublicCategoryBySlug(req: Request, res: Response): Promise<void> {
    const slug = req.params.slug!;
    const category = await categoryService.getPublicCategoryBySlug(slug);
    sendSuccess(res, category, 'Category details retrieved successfully.');
  }

  // Admin
  public async createCategory(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const created = await categoryService.createCategory(adminId, req.body, context);
    sendCreated(res, created, 'Category created successfully.');
  }

  public async getAdminCategories(_req: Request, res: Response): Promise<void> {
    const categories = await categoryService.getAdminCategories();
    sendSuccess(res, categories, 'Admin categories retrieved successfully.');
  }

  public async getAdminCategoryById(req: Request, res: Response): Promise<void> {
    const categoryId = req.params.categoryId!;
    const category = await categoryService.getAdminCategoryById(categoryId);
    sendSuccess(res, category, 'Admin category details retrieved successfully.');
  }

  public async updateCategory(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const categoryId = req.params.categoryId!;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const updated = await categoryService.updateCategory(adminId, categoryId, req.body, context);
    sendSuccess(res, updated, 'Category updated successfully.');
  }

  public async updateCategoryStatus(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const categoryId = req.params.categoryId!;
    const { isActive } = req.body;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const updated = await categoryService.updateCategoryStatus(
      adminId,
      categoryId,
      isActive,
      context
    );
    sendSuccess(res, updated, 'Category status updated successfully.');
  }

  public async deleteCategory(req: Request, res: Response): Promise<void> {
    const adminId = req.user!.userId;
    const categoryId = req.params.categoryId!;
    const context = { ip: req.ip, userAgent: req.headers['user-agent'] };
    await categoryService.deleteCategory(adminId, categoryId, context);
    sendSuccess(res, null, 'Category deleted successfully.');
  }
}

export const categoryController = new CategoryController();
