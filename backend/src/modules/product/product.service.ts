import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { productRepository, type ProductQueryOptions } from './product.repository.js';
import { categoryRepository } from './category.repository.js';
import { productStorageService } from './product-storage.service.js';
import { resolveUniqueSlug } from './slug.util.js';
import { MAX_PRODUCT_IMAGES, PRODUCT_PAGINATION_DEFAULTS } from './product.constants.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { ProductStatus } from '@shared/enums.js';
import { searchCacheService, SearchCacheService } from '../../services/searchCache.service.js';
import { SearchAnalytics } from '../../models/SearchAnalytics.model.js';
import { categoryService } from './category.service.js';
import { anonymizeIp, normalizeSearchQuery } from './search.util.js';
import type {
  CreateProductDto,
  UpdateProductDto,
  ProductDto,
  ProductListItemDto,
  PaginatedProductsDto,
  AddProductImageDto,
  ProductSuggestionsDto,
  ProductSearchResponseDto,
} from '@shared/api.types.js';
import type { ProductDocument } from '../../models/Product.model.js';
import type { CategoryDocument } from '../../models/Category.model.js';
import type { IProductImage } from '@shared/models.types.js';

class ProductService {
  public async createProduct(
    adminId: string,
    dto: CreateProductDto,
    context?: { ip?: string; userAgent?: string }
  ): Promise<ProductDto> {
    const title = dto.title || dto.name!;

    // 1. Validate SKU uniqueness
    const sku = dto.sku.toUpperCase();
    const isSkuTaken = await productRepository.isSkuTaken(sku);
    if (isSkuTaken) {
      throw AppError.conflict(`Product SKU '${sku}' is already in use.`, ErrorCodes.DUPLICATE_SKU);
    }

    // 2. Validate / generate unique slug
    let slug: string;
    if (dto.slug) {
      const isTaken = await productRepository.isSlugTaken(dto.slug);
      if (isTaken) {
        throw AppError.conflict(
          `Product slug '${dto.slug}' is already in use.`,
          ErrorCodes.DUPLICATE_SLUG
        );
      }
      slug = dto.slug;
    } else {
      slug = await resolveUniqueSlug(title, (s) =>
        productRepository.isSlugTaken(s).then((taken) => !taken)
      );
    }

    // 3. Validate category reference
    const category = await categoryRepository.findById(dto.categoryId);
    if (!category) {
      throw AppError.notFound('Associated category not found.', ErrorCodes.CATEGORY_NOT_FOUND);
    }

    // 4. Validate subcategory reference if supplied
    if (dto.subCategoryId) {
      const subCategory = await categoryRepository.findById(dto.subCategoryId);
      if (!subCategory) {
        throw AppError.notFound('Associated subcategory not found.', ErrorCodes.CATEGORY_NOT_FOUND);
      }
    }

    // 5. Validate pricing logic
    this.validatePricing(
      dto.regularPrice,
      dto.salePrice,
      dto.saleStartDate ? new Date(dto.saleStartDate) : undefined,
      dto.saleEndDate ? new Date(dto.saleEndDate) : undefined
    );

    // 6. Validate variant uniqueness if variants provided
    if (dto.hasVariants && dto.variants && dto.variants.length > 0) {
      const variantSkus = new Set<string>();
      for (const variant of dto.variants) {
        const vSku = variant.sku.toUpperCase();
        if (vSku === sku || variantSkus.has(vSku)) {
          throw AppError.badRequest(
            `Variant SKU '${vSku}' duplicates parent SKU or another variant SKU.`,
            ErrorCodes.DUPLICATE_SKU
          );
        }
        const isTaken = await productRepository.isSkuTaken(vSku);
        if (isTaken) {
          throw AppError.conflict(
            `Variant SKU '${vSku}' is already in use by another product.`,
            ErrorCodes.DUPLICATE_SKU
          );
        }
        variantSkus.add(vSku);
      }
    }

    const initialImages: IProductImage[] = [];
    if (dto.imageUrl) {
      initialImages.push({
        publicId: `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        url: dto.imageUrl,
        alt: title,
        isThumbnail: true,
        displayOrder: 0,
      });
    }

    const product = await productRepository.create({
      title,
      slug,
      sku,
      barcode: dto.barcode,
      brand: dto.brand,
      shortDescription: dto.shortDescription,
      fullDescription: dto.fullDescription,
      regularPrice: dto.regularPrice,
      salePrice: dto.salePrice,
      saleStartDate: dto.saleStartDate ? new Date(dto.saleStartDate) : undefined,
      saleEndDate: dto.saleEndDate ? new Date(dto.saleEndDate) : undefined,
      costPrice: dto.costPrice,
      currency: dto.currency || 'NGN',
      categoryId: dto.categoryId as unknown as import('mongoose').Types.ObjectId,
      subCategoryId:
        (dto.subCategoryId as unknown as import('mongoose').Types.ObjectId) || undefined,
      images: initialImages,
      stockQuantity: dto.stockQuantity ?? 0,
      lowStockThreshold: dto.lowStockThreshold ?? 5,
      weightGrams: dto.weightGrams,
      dimensions: dto.dimensions
        ? {
            length: dto.dimensions.length ?? 0,
            width: dto.dimensions.width ?? 0,
            height: dto.dimensions.height ?? 0,
            unit: dto.dimensions.unit || 'cm',
          }
        : undefined,
      status: dto.status || ProductStatus.DRAFT,
      featured: dto.featured ?? false,
      tags: dto.tags || [],
      attributes: dto.attributes || {},
      hasVariants: dto.hasVariants ?? false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variants: (dto.variants as any) || [],
      seo: dto.seo,
      createdBy: adminId as unknown as import('mongoose').Types.ObjectId,
    });

    await productRepository.logAudit({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_CREATE_PRODUCT',
      entityId: product._id.toString(),
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: { after: dto },
    });

    searchCacheService.invalidateProductCaches();
    const populated = await productRepository.findById(product._id.toString());
    return this.formatProduct(populated || product);
  }

  public async updateProduct(
    adminId: string,
    productId: string,
    dto: UpdateProductDto,
    context?: { ip?: string; userAgent?: string }
  ): Promise<ProductDto> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.PRODUCT_NOT_FOUND);
    }

    const title = dto.title || dto.name || product.title;

    // 1. Validate SKU uniqueness if SKU changing
    let sku = product.sku;
    if (dto.sku && dto.sku.toUpperCase() !== product.sku) {
      sku = dto.sku.toUpperCase();
      const isTaken = await productRepository.isSkuTaken(sku, productId);
      if (isTaken) {
        throw AppError.conflict(
          `Product SKU '${sku}' is already in use.`,
          ErrorCodes.DUPLICATE_SKU
        );
      }
    }

    // 2. Validate slug uniqueness if slug changing
    let slug = product.slug;
    if (dto.slug && dto.slug !== product.slug) {
      const isTaken = await productRepository.isSlugTaken(dto.slug, productId);
      if (isTaken) {
        throw AppError.conflict(
          `Product slug '${dto.slug}' is already in use.`,
          ErrorCodes.DUPLICATE_SLUG
        );
      }
      slug = dto.slug;
    } else if (!dto.slug && (dto.title || dto.name) && title !== product.title) {
      slug = await resolveUniqueSlug(
        title,
        (s) => productRepository.isSlugTaken(s, productId).then((taken) => !taken),
        product.slug
      );
    }

    // 3. Validate category reference if changing
    if (dto.categoryId && dto.categoryId !== product.categoryId.toString()) {
      const category = await categoryRepository.findById(dto.categoryId);
      if (!category) {
        throw AppError.notFound('Associated category not found.', ErrorCodes.CATEGORY_NOT_FOUND);
      }
    }

    // 4. Validate pricing logic
    const regularPrice = dto.regularPrice !== undefined ? dto.regularPrice : product.regularPrice;
    const salePrice =
      dto.salePrice !== undefined ? (dto.salePrice ?? undefined) : product.salePrice;
    const saleStartDate =
      dto.saleStartDate !== undefined
        ? dto.saleStartDate
          ? new Date(dto.saleStartDate)
          : undefined
        : product.saleStartDate;
    const saleEndDate =
      dto.saleEndDate !== undefined
        ? dto.saleEndDate
          ? new Date(dto.saleEndDate)
          : undefined
        : product.saleEndDate;

    this.validatePricing(regularPrice, salePrice, saleStartDate, saleEndDate);

    // 5. Validate variant uniqueness if updating variants
    if (dto.variants && dto.variants.length > 0) {
      const variantSkus = new Set<string>();
      for (const variant of dto.variants) {
        const vSku = variant.sku.toUpperCase();
        if (vSku === sku || variantSkus.has(vSku)) {
          throw AppError.badRequest(
            `Variant SKU '${vSku}' duplicates parent SKU or another variant SKU.`,
            ErrorCodes.DUPLICATE_SKU
          );
        }
        const isTaken = await productRepository.isSkuTaken(vSku, productId);
        if (isTaken) {
          throw AppError.conflict(
            `Variant SKU '${vSku}' is already in use by another product.`,
            ErrorCodes.DUPLICATE_SKU
          );
        }
        variantSkus.add(vSku);
      }
    }

    // 6. Preserve historical slug references for search engine and URL stability
    const previousSlugs = [...(product.previousSlugs || [])];
    if (slug !== product.slug && !previousSlugs.includes(product.slug)) {
      previousSlugs.push(product.slug);
    }

    const updatePayload: Record<string, unknown> = {
      ...dto,
      title,
      slug,
      previousSlugs,
      sku,
      updatedBy: adminId,
    };

    const updated = await productRepository.update(productId, updatePayload);
    if (!updated) {
      throw AppError.internal('Failed to update product.');
    }

    await productRepository.logAudit({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_UPDATE_PRODUCT',
      entityId: productId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: { before: product.toJSON(), after: dto },
    });

    searchCacheService.invalidateProductCaches();
    return this.formatProduct(updated);
  }

  public async updateProductStatus(
    adminId: string,
    productId: string,
    status: ProductStatus,
    context?: { ip?: string; userAgent?: string }
  ): Promise<ProductDto> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.PRODUCT_NOT_FOUND);
    }

    const updated = await productRepository.update(productId, {
      status,
      updatedBy: adminId,
    });
    if (!updated) {
      throw AppError.internal('Failed to update product status.');
    }

    await productRepository.logAudit({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_UPDATE_PRODUCT_STATUS',
      entityId: productId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: { before: { status: product.status }, after: { status } },
    });

    searchCacheService.invalidateProductCaches();
    return this.formatProduct(updated);
  }

  public async deleteOrArchiveProduct(
    adminId: string,
    productId: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.PRODUCT_NOT_FOUND);
    }

    // Soft delete by setting status to ARCHIVED
    await productRepository.deleteOrArchive(productId);

    await productRepository.logAudit({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_ARCHIVE_PRODUCT',
      entityId: productId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: {
        before: { status: product.status },
        after: { status: ProductStatus.ARCHIVED },
      },
    });

    searchCacheService.invalidateProductCaches();
  }

  public async uploadProductImage(
    adminId: string,
    productId: string,
    buffer: Buffer,
    mimeType: string,
    options: AddProductImageDto,
    context?: { ip?: string; userAgent?: string }
  ): Promise<ProductDto> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.PRODUCT_NOT_FOUND);
    }

    if (product.images.length >= MAX_PRODUCT_IMAGES) {
      throw AppError.badRequest(
        `Product already contains the maximum limit of ${MAX_PRODUCT_IMAGES} images.`,
        ErrorCodes.BAD_REQUEST
      );
    }

    const uploadResult = await productStorageService.uploadProductImage(
      buffer,
      mimeType,
      productId
    );

    const isFirstImage = product.images.length === 0;
    const shouldBeThumbnail = options.isThumbnail ?? isFirstImage;

    const newImage: IProductImage = {
      publicId: uploadResult.publicId,
      url: uploadResult.url,
      alt: options.alt || product.title,
      isThumbnail: shouldBeThumbnail,
      displayOrder: options.displayOrder ?? product.images.length,
    };

    // If marked as thumbnail, clear thumbnail on other images
    if (shouldBeThumbnail && product.images.length > 0) {
      product.images.forEach((img) => (img.isThumbnail = false));
    }

    const updated = await productRepository.addImage(productId, newImage);
    if (!updated) {
      throw AppError.internal('Failed to attach image to product.');
    }

    await productRepository.logAudit({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_UPLOAD_PRODUCT_IMAGE',
      entityId: productId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: { after: newImage },
    });

    searchCacheService.invalidateProductCaches();
    return this.formatProduct(updated);
  }

  public async removeProductImage(
    adminId: string,
    productId: string,
    publicId: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<ProductDto> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.PRODUCT_NOT_FOUND);
    }

    const targetImage = product.images.find((img) => img.publicId === publicId);
    if (!targetImage) {
      throw AppError.notFound('Product image not found.', ErrorCodes.IMAGE_NOT_FOUND);
    }

    // Delete from storage
    await productStorageService.deleteProductImage(targetImage.publicId, targetImage.url);

    // Remove from product
    const updated = await productRepository.removeImage(productId, publicId);
    if (!updated) {
      throw AppError.internal('Failed to remove image from product.');
    }

    // If deleted image was thumbnail and images remain, promote first image
    const firstRemaining = updated.images[0];
    if (targetImage.isThumbnail && firstRemaining) {
      await productRepository.setPrimaryImage(productId, firstRemaining.publicId);
    }

    await productRepository.logAudit({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_REMOVE_PRODUCT_IMAGE',
      entityId: productId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: { before: targetImage },
    });

    searchCacheService.invalidateProductCaches();
    const refreshed = await productRepository.findById(productId);
    return this.formatProduct(refreshed || updated);
  }

  public async setPrimaryProductImage(
    adminId: string,
    productId: string,
    publicId: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<ProductDto> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.PRODUCT_NOT_FOUND);
    }

    const updated = await productRepository.setPrimaryImage(productId, publicId);
    if (!updated) {
      throw AppError.notFound('Specified image not found on product.', ErrorCodes.IMAGE_NOT_FOUND);
    }

    await productRepository.logAudit({
      actorId: adminId,
      actorRole: 'admin',
      action: 'ADMIN_SET_PRIMARY_PRODUCT_IMAGE',
      entityId: productId,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      changesDiff: { after: { primaryImageId: publicId } },
    });

    searchCacheService.invalidateProductCaches();
    return this.formatProduct(updated);
  }

  public async getPublicProducts(
    query: Partial<ProductQueryOptions>
  ): Promise<PaginatedProductsDto> {
    const page = query.page || PRODUCT_PAGINATION_DEFAULTS.DEFAULT_PAGE;
    const limit = Math.min(
      query.limit || PRODUCT_PAGINATION_DEFAULTS.DEFAULT_LIMIT,
      PRODUCT_PAGINATION_DEFAULTS.MAX_LIMIT
    );

    const cacheKey = searchCacheService.generateKey('prod:list', { ...query, page, limit });
    const cached = searchCacheService.get<PaginatedProductsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const { products, total } = await productRepository.findPublicProducts({
      ...query,
      page,
      limit,
    });

    const result: PaginatedProductsDto = {
      products: products.map((p) => this.formatProductListItem(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };

    searchCacheService.set(cacheKey, result, SearchCacheService.TTL.SEARCH_RESULTS);
    return result;
  }

  public async getPublicProductBySlug(slug: string): Promise<ProductDto> {
    const product = await productRepository.findBySlug(slug);
    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw AppError.notFound('Product not found.', ErrorCodes.PRODUCT_NOT_FOUND);
    }
    return this.formatProduct(product);
  }

  public async getFeaturedProducts(limit = 8): Promise<ProductListItemDto[]> {
    const cacheKey = searchCacheService.generateKey('featured', { limit });
    const cached = searchCacheService.get<ProductListItemDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const products = await productRepository.findFeatured(limit);
    const result = products.map((p) => this.formatProductListItem(p));
    searchCacheService.set(cacheKey, result, SearchCacheService.TTL.FEATURED);
    return result;
  }

  public async getNewArrivals(limit = 8): Promise<ProductListItemDto[]> {
    const cacheKey = searchCacheService.generateKey('new_arrivals', { limit });
    const cached = searchCacheService.get<ProductListItemDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const products = await productRepository.findNewArrivals(limit);
    const result = products.map((p) => this.formatProductListItem(p));
    searchCacheService.set(cacheKey, result, SearchCacheService.TTL.NEW_ARRIVALS);
    return result;
  }

  public async searchProducts(
    query: Partial<ProductQueryOptions>,
    context?: { userId?: string; sessionId?: string; ip?: string; userAgent?: string }
  ): Promise<ProductSearchResponseDto> {
    const page = query.page || PRODUCT_PAGINATION_DEFAULTS.DEFAULT_PAGE;
    const limit = Math.min(
      query.limit || PRODUCT_PAGINATION_DEFAULTS.DEFAULT_LIMIT,
      PRODUCT_PAGINATION_DEFAULTS.MAX_LIMIT
    );

    const cacheKey = searchCacheService.generateKey('prod:search', { ...query, page, limit });
    const cached = searchCacheService.get<ProductSearchResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const { products, total, facets } = await productRepository.searchProducts({
      ...query,
      page,
      limit,
    });

    const searchTerm = normalizeSearchQuery(query.q || query.search || '');

    // Asynchronously record privacy-conscious search analytics
    if (searchTerm) {
      SearchAnalytics.create({
        query: searchTerm,
        resultCount: total,
        userId:
          context?.userId && Types.ObjectId.isValid(context.userId)
            ? new Types.ObjectId(context.userId)
            : undefined,
        sessionId: context?.sessionId,
        filters: {
          category: query.category,
          subCategory: query.subCategory,
          brand: query.brand,
          minPrice: query.minPrice,
          maxPrice: query.maxPrice,
          availability: query.availability,
        },
        anonymizedIp: anonymizeIp(context?.ip),
        userAgent: context?.userAgent ? context.userAgent.slice(0, 255) : undefined,
      }).catch(() => {
        // Safe fire-and-forget: does not block search response
      });
    }

    const response: ProductSearchResponseDto = {
      products: products.map((p) => this.formatProductListItem(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
      query: searchTerm,
      facets,
    };

    searchCacheService.set(cacheKey, response, SearchCacheService.TTL.SEARCH_RESULTS);
    return response;
  }

  public async getSuggestions(query: string, limit = 5): Promise<ProductSuggestionsDto> {
    const clean = normalizeSearchQuery(query, 60);
    if (!clean) {
      return { query: '', products: [], categories: [], brands: [] };
    }

    const cacheKey = searchCacheService.generateKey('sugg', { q: clean, limit });
    const cached = searchCacheService.get<ProductSuggestionsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const suggestions = await productRepository.getSuggestions(clean, limit);
    searchCacheService.set(cacheKey, suggestions, SearchCacheService.TTL.SUGGESTIONS);
    return suggestions;
  }

  public async getCategoryProducts(
    categorySlug: string,
    query: Partial<ProductQueryOptions>
  ): Promise<PaginatedProductsDto> {
    const { categoryIds } = await categoryService.getCategoryWithDescendantIds(categorySlug);
    return this.getPublicProducts({
      ...query,
      categoryIds,
    });
  }

  public async getRelatedProducts(slug: string, limit = 4): Promise<ProductListItemDto[]> {
    const product = await productRepository.findBySlug(slug);
    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw AppError.notFound('Product not found.', ErrorCodes.PRODUCT_NOT_FOUND);
    }

    const rawCategory = product.categoryId as unknown;
    const categoryId =
      rawCategory && typeof rawCategory === 'object' && '_id' in rawCategory
        ? (rawCategory as { _id: { toString(): string } })._id.toString()
        : product.categoryId?.toString();

    if (!categoryId) return [];

    const related = await productRepository.findRelated(categoryId, product._id.toString(), limit);
    return related.map((p) => this.formatProductListItem(p));
  }

  public async getAdminProducts(
    query: Partial<ProductQueryOptions>
  ): Promise<PaginatedProductsDto> {
    const page = query.page || PRODUCT_PAGINATION_DEFAULTS.DEFAULT_PAGE;
    const limit = Math.min(
      query.limit || PRODUCT_PAGINATION_DEFAULTS.DEFAULT_LIMIT,
      PRODUCT_PAGINATION_DEFAULTS.MAX_LIMIT
    );

    const { products, total } = await productRepository.findAdminProducts({
      ...query,
      page,
      limit,
    });

    return {
      products: products.map((p) => this.formatProductListItem(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  public async getAdminProductById(id: string): Promise<ProductDto> {
    const product = await productRepository.findById(id);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.PRODUCT_NOT_FOUND);
    }
    return this.formatProduct(product);
  }

  private validatePricing(
    regularPrice: number,
    salePrice?: number,
    saleStartDate?: Date,
    saleEndDate?: Date
  ): void {
    if (regularPrice <= 0) {
      throw AppError.badRequest(
        'Regular price must be greater than zero.',
        ErrorCodes.INVALID_SALE_PRICE
      );
    }

    if (salePrice !== undefined && salePrice !== null) {
      if (salePrice < 0) {
        throw AppError.badRequest('Sale price cannot be negative.', ErrorCodes.INVALID_SALE_PRICE);
      }
      if (salePrice > regularPrice) {
        throw AppError.badRequest(
          `Sale price (${salePrice}) cannot be greater than regular price (${regularPrice}).`,
          ErrorCodes.INVALID_SALE_PRICE
        );
      }
    }

    if (saleStartDate && saleEndDate && saleEndDate <= saleStartDate) {
      throw AppError.badRequest(
        'Sale end date must be after sale start date.',
        ErrorCodes.INVALID_SALE_DATES
      );
    }
  }

  private formatProduct(doc: ProductDocument): ProductDto {
    const categoryDoc = doc.categoryId as unknown as CategoryDocument | undefined;
    const subCategoryDoc = doc.subCategoryId as unknown as CategoryDocument | undefined;

    const thumbnails = doc.images.filter((img) => img.isThumbnail);
    const mainImage =
      thumbnails.length > 0
        ? thumbnails[thumbnails.length - 1]
        : (doc.images.length > 0 ? doc.images[doc.images.length - 1] : undefined);

    return {
      id: doc._id.toString(),
      title: doc.title,
      name: doc.title,
      slug: doc.slug,
      previousSlugs: doc.previousSlugs || [],
      sku: doc.sku,
      barcode: doc.barcode,
      brand: doc.brand,
      shortDescription: doc.shortDescription,
      fullDescription: doc.fullDescription,
      regularPrice: doc.regularPrice,
      salePrice: doc.salePrice,
      saleStartDate: doc.saleStartDate?.toISOString(),
      saleEndDate: doc.saleEndDate?.toISOString(),
      currency: doc.currency || 'NGN',
      categoryId: doc.categoryId?._id ? doc.categoryId._id.toString() : doc.categoryId?.toString(),
      subCategoryId: doc.subCategoryId?._id
        ? doc.subCategoryId._id.toString()
        : doc.subCategoryId?.toString(),
      category: categoryDoc?._id
        ? {
            id: categoryDoc._id.toString(),
            name: categoryDoc.name,
            slug: categoryDoc.slug,
            description: categoryDoc.description,
            displayOrder: categoryDoc.displayOrder,
            isActive: categoryDoc.isActive,
            createdAt: categoryDoc.createdAt?.toISOString(),
            updatedAt: categoryDoc.updatedAt?.toISOString(),
          }
        : undefined,
      subCategory: subCategoryDoc?._id
        ? {
            id: subCategoryDoc._id.toString(),
            name: subCategoryDoc.name,
            slug: subCategoryDoc.slug,
            description: subCategoryDoc.description,
            displayOrder: subCategoryDoc.displayOrder,
            isActive: subCategoryDoc.isActive,
            createdAt: subCategoryDoc.createdAt?.toISOString(),
            updatedAt: subCategoryDoc.updatedAt?.toISOString(),
          }
        : undefined,
      images: doc.images.map((img) => ({
        publicId: img.publicId,
        url: img.url,
        alt: img.alt,
        isThumbnail: img.isThumbnail,
        displayOrder: img.displayOrder,
      })),
      mainImage: mainImage
        ? {
            publicId: mainImage.publicId,
            url: mainImage.url,
            alt: mainImage.alt,
            isThumbnail: mainImage.isThumbnail,
            displayOrder: mainImage.displayOrder,
          }
        : undefined,
      hasVariants: doc.hasVariants,
      variants: (doc.variants || []).map((v) => {
        const vId = (v as unknown as { _id?: { toString(): string } })._id?.toString();
        return {
          id: vId,
          variantId: vId,
          sku: v.sku,
          title: v.title,
          price: v.price,
          stockQuantity: v.stockQuantity,
          attributes: (v.attributes as unknown as Record<string, unknown>) || {},
          imageUrl: v.imageUrl,
        };
      }),
      attributes: (doc.attributes as unknown as Record<string, unknown>) || {},
      stockQuantity: doc.stockQuantity,
      lowStockThreshold: doc.lowStockThreshold,
      weightGrams: doc.weightGrams,
      dimensions: doc.dimensions,
      averageRating: doc.averageRating,
      reviewCount: doc.reviewCount,
      status: doc.status,
      featured: doc.featured,
      tags: doc.tags,
      seo: doc.seo,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private formatProductListItem(doc: ProductDocument): ProductListItemDto {
    const thumbnails = doc.images.filter((img) => img.isThumbnail);
    const mainImage =
      thumbnails.length > 0
        ? thumbnails[thumbnails.length - 1]
        : (doc.images.length > 0 ? doc.images[doc.images.length - 1] : undefined);

    return {
      id: doc._id.toString(),
      title: doc.title,
      name: doc.title,
      slug: doc.slug,
      sku: doc.sku,
      brand: doc.brand,
      shortDescription: doc.shortDescription,
      regularPrice: doc.regularPrice,
      salePrice: doc.salePrice,
      currency: doc.currency || 'NGN',
      categoryId: doc.categoryId?._id ? doc.categoryId._id.toString() : doc.categoryId?.toString(),
      subCategoryId: doc.subCategoryId?._id
        ? doc.subCategoryId._id.toString()
        : doc.subCategoryId?.toString(),
      thumbnailUrl: mainImage?.url,
      images: doc.images.map((img) => ({
        publicId: img.publicId,
        url: img.url,
        alt: img.alt,
        isThumbnail: img.isThumbnail,
        displayOrder: img.displayOrder,
      })),
      status: doc.status,
      featured: doc.featured,
      stockQuantity: doc.stockQuantity,
      averageRating: doc.averageRating,
      reviewCount: doc.reviewCount,
      createdAt: doc.createdAt.toISOString(),
    };
  }
}

export const productService = new ProductService();
