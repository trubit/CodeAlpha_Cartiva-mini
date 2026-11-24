import { categoryRepository } from './category.repository.js';
import { resolveUniqueSlug } from './slug.util.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { searchCacheService, SearchCacheService } from '../../services/searchCache.service.js';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryDto,
  CategoryWithChildrenDto,
} from '@shared/api.types.js';
import type { CategoryDocument } from '../../models/Category.model.js';

class CategoryService {
  public async createCategory(
    adminId: string,
    dto: CreateCategoryDto,
    context?: { ip?: string; userAgent?: string }
  ): Promise<CategoryDto> {
    const slug = dto.slug
      ? await this.validateManualSlug(dto.slug)
      : await resolveUniqueSlug(dto.name, (s) =>
          categoryRepository.isSlugTaken(s).then((taken) => !taken)
        );

    // Verify parent exists if provided
    if (dto.parentId) {
      const parent = await categoryRepository.findById(dto.parentId);
      if (!parent) {
        throw AppError.notFound('Parent category not found.', ErrorCodes.CATEGORY_NOT_FOUND);
      }
    }

    const category = await categoryRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      parentId: (dto.parentId as unknown as import('mongoose').Types.ObjectId) || null,
      imageUrl: dto.imageUrl,
      displayOrder: dto.displayOrder ?? 0,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      seo: dto.seo,
      createdBy: adminId as unknown as import('mongoose').Types.ObjectId,
    });

    await categoryRepository.logAudit({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_CREATE_CATEGORY',
      entityId: category._id.toString(),
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: { after: dto },
    });

    searchCacheService.invalidateCategoryCaches();

    return this.formatCategory(category);
  }

  public async updateCategory(
    adminId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
    context?: { ip?: string; userAgent?: string }
  ): Promise<CategoryDto> {
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      throw AppError.notFound('Category not found.', ErrorCodes.CATEGORY_NOT_FOUND);
    }

    // Verify parent reference & prevent circular hierarchy
    if (dto.parentId !== undefined) {
      if (dto.parentId !== null) {
        if (dto.parentId === categoryId) {
          throw AppError.badRequest(
            'A category cannot be its own parent category.',
            ErrorCodes.CIRCULAR_CATEGORY_DEPENDENCY
          );
        }

        const parent = await categoryRepository.findById(dto.parentId);
        if (!parent) {
          throw AppError.notFound('Parent category not found.', ErrorCodes.CATEGORY_NOT_FOUND);
        }

        const isCircular = await categoryRepository.isCircularReference(categoryId, dto.parentId);
        if (isCircular) {
          throw AppError.badRequest(
            'Circular category relationship detected. A category cannot be parented to its own descendant.',
            ErrorCodes.CIRCULAR_CATEGORY_DEPENDENCY
          );
        }
      }
    }

    // Check slug uniqueness if slug or name is being modified
    let newSlug = category.slug;
    if (dto.slug && dto.slug !== category.slug) {
      const taken = await categoryRepository.isSlugTaken(dto.slug, categoryId);
      if (taken) {
        throw AppError.conflict('Category slug is already in use.', ErrorCodes.DUPLICATE_SLUG);
      }
      newSlug = dto.slug;
    } else if (!dto.slug && dto.name && dto.name !== category.name) {
      newSlug = await resolveUniqueSlug(
        dto.name,
        (s) => categoryRepository.isSlugTaken(s, categoryId).then((taken) => !taken),
        category.slug
      );
    }

    const updatePayload: Record<string, unknown> = {
      ...dto,
      slug: newSlug,
      updatedBy: adminId,
    };

    const updated = await categoryRepository.update(categoryId, updatePayload);
    if (!updated) {
      throw AppError.internal('Failed to update category.');
    }

    await categoryRepository.logAudit({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_UPDATE_CATEGORY',
      entityId: categoryId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: { before: category.toJSON(), after: dto },
    });

    searchCacheService.invalidateCategoryCaches();

    return this.formatCategory(updated);
  }

  public async updateCategoryStatus(
    adminId: string,
    categoryId: string,
    isActive: boolean,
    context?: { ip?: string; userAgent?: string }
  ): Promise<CategoryDto> {
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      throw AppError.notFound('Category not found.', ErrorCodes.CATEGORY_NOT_FOUND);
    }

    const updated = await categoryRepository.update(categoryId, {
      isActive,
      updatedBy: adminId,
    });
    if (!updated) {
      throw AppError.internal('Failed to update category status.');
    }

    await categoryRepository.logAudit({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_UPDATE_CATEGORY_STATUS',
      entityId: categoryId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: { before: { isActive: category.isActive }, after: { isActive } },
    });

    searchCacheService.invalidateCategoryCaches();

    return this.formatCategory(updated);
  }

  public async deleteCategory(
    adminId: string,
    categoryId: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      throw AppError.notFound('Category not found.', ErrorCodes.CATEGORY_NOT_FOUND);
    }

    // Integrity check: prevent deleting category with products
    const productCount = await categoryRepository.countProductsByCategoryId(categoryId);
    if (productCount > 0) {
      throw AppError.badRequest(
        `Cannot delete category containing ${productCount} active product(s). Please reassign or archive products first.`,
        ErrorCodes.CATEGORY_HAS_PRODUCTS
      );
    }

    // Check if subcategories exist
    const subCategories = await categoryRepository.findSubCategories(categoryId);
    if (subCategories.length > 0) {
      throw AppError.badRequest(
        `Cannot delete category containing ${subCategories.length} child subcategory(s). Please delete or reassign subcategories first.`,
        ErrorCodes.CIRCULAR_CATEGORY_DEPENDENCY
      );
    }

    await categoryRepository.delete(categoryId);

    await categoryRepository.logAudit({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_DELETE_CATEGORY',
      entityId: categoryId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: { before: category.toJSON() },
    });

    searchCacheService.invalidateCategoryCaches();
  }

  public async getPublicCategories(): Promise<CategoryWithChildrenDto[]> {
    const cacheKey = 'cat:public_tree';
    const cached = searchCacheService.get<CategoryWithChildrenDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const allActive = await categoryRepository.findAll({ isActive: true });

    // Build hierarchy
    const rootCategories: CategoryWithChildrenDto[] = [];
    const childrenMap = new Map<string, CategoryWithChildrenDto[]>();

    allActive.forEach((cat) => {
      const formatted: CategoryWithChildrenDto = {
        ...this.formatCategory(cat),
        children: [],
      };

      if (!cat.parentId) {
        rootCategories.push(formatted);
      } else {
        const parentStr = cat.parentId.toString();
        const list = childrenMap.get(parentStr) || [];
        list.push(formatted);
        childrenMap.set(parentStr, list);
      }
    });

    // Attach children to parents
    rootCategories.forEach((parent) => {
      parent.children = childrenMap.get(parent.id) || [];
    });

    searchCacheService.set(cacheKey, rootCategories, SearchCacheService.TTL.CATEGORIES);

    return rootCategories;
  }

  public async getPublicCategoryBySlug(slug: string): Promise<CategoryDto> {
    const cacheKey = `cat:detail:${slug}`;
    const cached = searchCacheService.get<CategoryDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const category = await categoryRepository.findBySlug(slug);
    if (!category || !category.isActive) {
      throw AppError.notFound('Category not found.', ErrorCodes.CATEGORY_NOT_FOUND);
    }
    const productCount = await categoryRepository.countProductsByCategoryId(
      category._id.toString()
    );
    const result: CategoryDto = {
      ...this.formatCategory(category),
      productCount,
    };

    searchCacheService.set(cacheKey, result, SearchCacheService.TTL.CATEGORIES);

    return result;
  }

  public async getCategoryWithDescendantIds(slug: string): Promise<{
    category: CategoryDocument;
    categoryIds: string[];
  }> {
    const category = await categoryRepository.findBySlug(slug);
    if (!category || !category.isActive) {
      throw AppError.notFound('Category not found.', ErrorCodes.CATEGORY_NOT_FOUND);
    }

    const subCategories = await categoryRepository.findSubCategories(category._id.toString());
    const activeSubCategories = subCategories.filter((sc) => sc.isActive);
    const categoryIds = [
      category._id.toString(),
      ...activeSubCategories.map((sc) => sc._id.toString()),
    ];

    return { category, categoryIds };
  }

  public async getAdminCategories(): Promise<CategoryDto[]> {
    const categories = await categoryRepository.findAll();
    return Promise.all(
      categories.map(async (cat) => {
        const productCount = await categoryRepository.countProductsByCategoryId(cat._id.toString());
        return {
          ...this.formatCategory(cat),
          productCount,
        };
      })
    );
  }

  public async getAdminCategoryById(id: string): Promise<CategoryDto> {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw AppError.notFound('Category not found.', ErrorCodes.CATEGORY_NOT_FOUND);
    }
    const productCount = await categoryRepository.countProductsByCategoryId(
      category._id.toString()
    );
    return {
      ...this.formatCategory(category),
      productCount,
    };
  }

  private async validateManualSlug(slug: string): Promise<string> {
    const taken = await categoryRepository.isSlugTaken(slug);
    if (taken) {
      throw AppError.conflict(
        `Category slug '${slug}' is already taken.`,
        ErrorCodes.DUPLICATE_SLUG
      );
    }
    return slug;
  }

  private formatCategory(doc: CategoryDocument): CategoryDto {
    return {
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      parentId: doc.parentId ? doc.parentId.toString() : null,
      imageUrl: doc.imageUrl,
      displayOrder: doc.displayOrder,
      isActive: doc.isActive,
      seo: doc.seo,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}

export const categoryService = new CategoryService();
