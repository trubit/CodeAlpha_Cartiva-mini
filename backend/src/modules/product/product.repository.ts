import { Types, type FilterQuery } from 'mongoose';
import { Product, type ProductDocument } from '../../models/Product.model.js';
import { Category } from '../../models/Category.model.js';
import { ProductStatus, ProductSortOption, ProductAvailabilityFilter } from '@shared/enums.js';
import type { IProductImage } from '@shared/models.types.js';
import type { ProductSuggestionsDto, SearchFacetSummaryDto } from '@shared/api.types.js';
import { AuditLog, type AuditLogDocument } from '../../models/AuditLog.model.js';
import { escapeRegex, normalizeSearchQuery } from './search.util.js';

export interface ProductQueryOptions {
  page: number;
  limit: number;
  category?: string;
  subCategory?: string;
  categoryIds?: string[];
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  status?: ProductStatus;
  availability?: ProductAvailabilityFilter;
  featured?: boolean;
  search?: string;
  q?: string;
  sort?: ProductSortOption | string;
  attributes?: Record<string, string>;
}

export class ProductRepository {
  public async create(data: Partial<ProductDocument>): Promise<ProductDocument> {
    return Product.create(data);
  }

  public async findById(id: string): Promise<ProductDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Product.findById(id).populate('categoryId subCategoryId');
  }

  public async findBySlug(slug: string): Promise<ProductDocument | null> {
    return Product.findOne({
      $or: [{ slug }, { previousSlugs: slug }],
    }).populate('categoryId subCategoryId');
  }

  public async findBySku(sku: string): Promise<ProductDocument | null> {
    const normalizedSku = sku.toUpperCase();
    return Product.findOne({
      $or: [{ sku: normalizedSku }, { 'variants.sku': normalizedSku }],
    }).populate('categoryId subCategoryId');
  }

  public async update(
    id: string,
    updateData: Record<string, unknown>
  ): Promise<ProductDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('categoryId subCategoryId');
  }

  public async deleteOrArchive(id: string): Promise<ProductDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    // Safe soft-delete / archival
    return Product.findByIdAndUpdate(
      id,
      { $set: { status: ProductStatus.ARCHIVED } },
      { new: true }
    );
  }

  public async isSkuTaken(sku: string, excludeId?: string): Promise<boolean> {
    const normalizedSku = sku.toUpperCase();
    const query: FilterQuery<ProductDocument> = {
      $or: [{ sku: normalizedSku }, { 'variants.sku': normalizedSku }],
    };
    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      query['_id'] = { $ne: new Types.ObjectId(excludeId) };
    }
    const count = await Product.countDocuments(query);
    return count > 0;
  }

  public async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const query: FilterQuery<ProductDocument> = {
      $or: [{ slug }, { previousSlugs: slug }],
    };
    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      query['_id'] = { $ne: new Types.ObjectId(excludeId) };
    }
    const count = await Product.countDocuments(query);
    return count > 0;
  }

  /**
   * Builds an array of MongoDB filter clauses from public query options.
   * Guarantees status: ProductStatus.PUBLISHED.
   */
  private buildPublicFilterClauses(options: ProductQueryOptions): FilterQuery<ProductDocument>[] {
    const clauses: FilterQuery<ProductDocument>[] = [{ status: ProductStatus.PUBLISHED }];

    // Taxonomy filtering: parent category + descendants or single category
    if (options.categoryIds && options.categoryIds.length > 0) {
      const validCategoryIds = options.categoryIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
      if (validCategoryIds.length > 0) {
        clauses.push({ categoryId: { $in: validCategoryIds } });
      }
    } else if (options.category && Types.ObjectId.isValid(options.category)) {
      clauses.push({ categoryId: new Types.ObjectId(options.category) });
    }

    if (options.subCategory && Types.ObjectId.isValid(options.subCategory)) {
      clauses.push({ subCategoryId: new Types.ObjectId(options.subCategory) });
    }

    // Brand filtering (case-insensitive exact match)
    if (options.brand) {
      clauses.push({ brand: new RegExp(`^${escapeRegex(options.brand)}$`, 'i') });
    }

    // Currency filtering
    if (options.currency) {
      clauses.push({ currency: options.currency.toUpperCase() });
    }

    // Price range filtering
    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      const priceClause: Record<string, number> = {};
      if (options.minPrice !== undefined) priceClause.$gte = options.minPrice;
      if (options.maxPrice !== undefined) priceClause.$lte = options.maxPrice;
      clauses.push({ regularPrice: priceClause });
    }

    // Featured filtering
    if (options.featured !== undefined) {
      clauses.push({ featured: options.featured });
    }

    // Inventory availability filtering (integrated with Phase 8 available stock logic)
    if (options.availability === ProductAvailabilityFilter.IN_STOCK) {
      clauses.push({
        $or: [
          { isInventoryTracked: false },
          {
            $expr: {
              $gt: [
                {
                  $subtract: [
                    { $ifNull: ['$stockQuantity', 0] },
                    { $ifNull: ['$reservedQuantity', 0] },
                  ],
                },
                0,
              ],
            },
          },
        ],
      });
    } else if (options.availability === ProductAvailabilityFilter.OUT_OF_STOCK) {
      clauses.push({
        isInventoryTracked: true,
        $expr: {
          $lte: [
            {
              $subtract: [
                { $ifNull: ['$stockQuantity', 0] },
                { $ifNull: ['$reservedQuantity', 0] },
              ],
            },
            0,
          ],
        },
      });
    }

    // Dynamic attribute filtering (e.g., attributes.color = "Black")
    if (options.attributes && typeof options.attributes === 'object') {
      for (const [key, value] of Object.entries(options.attributes)) {
        if (value && typeof value === 'string') {
          clauses.push({ [`attributes.${key}`]: value });
        }
      }
    }

    return clauses;
  }

  /**
   * Public Product Catalog query.
   * Strictly filters for status: ProductStatus.PUBLISHED.
   * Supports comprehensive filtering, keyword search, and deterministic sorting.
   */
  public async findPublicProducts(
    options: ProductQueryOptions
  ): Promise<{ products: ProductDocument[]; total: number }> {
    const clauses = this.buildPublicFilterClauses(options);
    const searchTerm = normalizeSearchQuery(options.q || options.search || '');

    let hasTextScore = false;

    if (searchTerm) {
      const words = searchTerm.split(/\s+/).filter(Boolean);
      if (words.length > 1) {
        const tokenClauses = words.map((w) => {
          const rx = new RegExp(escapeRegex(w), 'i');
          return {
            $or: [
              { title: rx },
              { brand: rx },
              { sku: rx },
              { shortDescription: rx },
              { tags: rx },
            ],
          };
        });
        clauses.push({ $and: tokenClauses });
      } else {
        const rx = new RegExp(escapeRegex(searchTerm), 'i');
        clauses.push({
          $or: [
            { title: rx },
            { brand: rx },
            { sku: rx },
            { shortDescription: rx },
            { tags: rx },
          ],
        });
      }
      hasTextScore = false;
    }

    const filter: FilterQuery<ProductDocument> =
      clauses.length === 1 ? clauses[0]! : { $and: clauses };

    // Deterministic sorting with secondary unique index (_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortOption: Record<string, any> = {};
    switch (options.sort) {
      case ProductSortOption.PRICE_ASC:
      case 'price_asc':
        sortOption.regularPrice = 1;
        sortOption._id = 1;
        break;
      case ProductSortOption.PRICE_DESC:
      case 'price_desc':
        sortOption.regularPrice = -1;
        sortOption._id = -1;
        break;
      case ProductSortOption.NAME_ASC:
      case 'name_asc':
        sortOption.title = 1;
        sortOption._id = 1;
        break;
      case ProductSortOption.NAME_DESC:
      case 'name_desc':
        sortOption.title = -1;
        sortOption._id = -1;
        break;
      case ProductSortOption.RATING:
      case 'rating':
        sortOption.averageRating = -1;
        sortOption.reviewCount = -1;
        sortOption._id = -1;
        break;
      case ProductSortOption.POPULAR:
      case 'popular':
        sortOption.reviewCount = -1;
        sortOption.averageRating = -1;
        sortOption._id = -1;
        break;
      case ProductSortOption.OLDEST:
      case 'oldest':
        sortOption.createdAt = 1;
        sortOption._id = 1;
        break;
      case ProductSortOption.RELEVANCE:
      case 'relevance':
        if (hasTextScore) {
          sortOption.score = { $meta: 'textScore' };
          sortOption._id = -1;
        } else {
          sortOption.createdAt = -1;
          sortOption._id = -1;
        }
        break;
      case ProductSortOption.NEWEST:
      case 'newest':
      default:
        sortOption.createdAt = -1;
        sortOption._id = -1;
        break;
    }

    const skip = (options.page - 1) * options.limit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(options.limit)
        .populate('categoryId subCategoryId'),
      Product.countDocuments(filter),
    ]);

    return { products, total };
  }

  /**
   * Search Engine Query with Facet Summaries.
   * Performs full-text / keyword product search with category, brand, price, and stock aggregations.
   */
  public async searchProducts(options: ProductQueryOptions): Promise<{
    products: ProductDocument[];
    total: number;
    facets: SearchFacetSummaryDto;
  }> {
    const { products, total } = await this.findPublicProducts(options);

    // Compute facet distribution over base matching criteria
    const facetClauses = this.buildPublicFilterClauses({
      ...options,
      brand: undefined, // Omit brand so customer can see all available brand facets
      minPrice: undefined,
      maxPrice: undefined,
      availability: undefined,
    });

    const searchTerm = normalizeSearchQuery(options.q || options.search || '');
    if (searchTerm) {
      const words = searchTerm.split(/\s+/).filter(Boolean);
      if (words.length > 1) {
        const tokenClauses = words.map((w) => {
          const rx = new RegExp(escapeRegex(w), 'i');
          return {
            $or: [
              { title: rx },
              { brand: rx },
              { sku: rx },
              { shortDescription: rx },
              { tags: rx },
            ],
          };
        });
        facetClauses.push({ $and: tokenClauses });
      } else {
        const rx = new RegExp(escapeRegex(searchTerm), 'i');
        facetClauses.push({
          $or: [
            { title: rx },
            { brand: rx },
            { sku: rx },
            { shortDescription: rx },
            { tags: rx },
          ],
        });
      }
    }

    const facetFilter = facetClauses.length === 1 ? facetClauses[0]! : { $and: facetClauses };

    const aggregationResult = await Product.aggregate([
      { $match: facetFilter },
      {
        $facet: {
          categories: [
            { $group: { _id: '$categoryId', count: { $sum: 1 } } },
            {
              $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'cat',
              },
            },
            { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                value: { $toString: '$_id' },
                label: { $ifNull: ['$cat.name', 'Uncategorized'] },
                count: 1,
              },
            },
            { $sort: { count: -1 } },
          ],
          brands: [
            { $match: { brand: { $exists: true, $ne: '' } } },
            { $group: { _id: '$brand', count: { $sum: 1 } } },
            {
              $project: {
                value: '$_id',
                label: '$_id',
                count: 1,
              },
            },
            { $sort: { count: -1 } },
            { $limit: 25 },
          ],
          priceStats: [
            {
              $group: {
                _id: null,
                min: { $min: '$regularPrice' },
                max: { $max: '$regularPrice' },
              },
            },
          ],
          availability: [
            {
              $group: {
                _id: null,
                inStock: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ['$isInventoryTracked', false] },
                          {
                            $gt: [
                              {
                                $subtract: [
                                  { $ifNull: ['$stockQuantity', 0] },
                                  { $ifNull: ['$reservedQuantity', 0] },
                                ],
                              },
                              0,
                            ],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                total: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const rawFacets = aggregationResult[0] || {};
    const priceStats = rawFacets.priceStats?.[0] || { min: 0, max: 0 };
    const availStats = rawFacets.availability?.[0] || { inStock: 0, total: 0 };

    const facets: SearchFacetSummaryDto = {
      categories: rawFacets.categories || [],
      brands: rawFacets.brands || [],
      priceRange: {
        min: priceStats.min ?? 0,
        max: priceStats.max ?? 0,
      },
      availability: {
        inStock: availStats.inStock ?? 0,
        outOfStock: Math.max(0, (availStats.total ?? 0) - (availStats.inStock ?? 0)),
      },
    };

    return { products, total, facets };
  }

  /**
   * Search Autocomplete & Suggestions.
   * Returns limited, fast suggestions matching product titles, categories, and brands.
   */
  public async getSuggestions(query: string, limit = 5): Promise<ProductSuggestionsDto> {
    const cleanQuery = normalizeSearchQuery(query, 60);
    if (!cleanQuery) {
      return { query: '', products: [], categories: [], brands: [] };
    }

    const safeRegex = new RegExp(escapeRegex(cleanQuery), 'i');

    const [matchingProducts, matchingCategories, matchingBrands] = await Promise.all([
      Product.find({
        status: ProductStatus.PUBLISHED,
        $or: [{ title: safeRegex }, { brand: safeRegex }, { sku: safeRegex }],
      })
        .limit(limit)
        .select('title slug regularPrice salePrice images brand categoryId')
        .populate('categoryId', 'name')
        .lean(),

      Category.find({
        isActive: true,
        name: safeRegex,
      })
        .limit(limit)
        .select('name slug')
        .lean(),

      Product.distinct('brand', {
        status: ProductStatus.PUBLISHED,
        brand: safeRegex,
      }),
    ]);

    const productSuggestions = matchingProducts.map((p) => {
      const cat = p.categoryId as unknown as { name?: string } | undefined;
      const thumbnail = p.images?.find((img) => img.isThumbnail) || p.images?.[0];
      return {
        id: p._id.toString(),
        title: p.title,
        slug: p.slug,
        regularPrice: p.regularPrice,
        salePrice: p.salePrice,
        thumbnailUrl: thumbnail?.url,
        brand: p.brand,
        categoryName: cat?.name,
      };
    });

    const categorySuggestions = matchingCategories.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
    }));

    const brandSuggestions = (matchingBrands as string[])
      .filter((b): b is string => Boolean(b && typeof b === 'string'))
      .slice(0, limit);

    return {
      query: cleanQuery,
      products: productSuggestions,
      categories: categorySuggestions,
      brands: brandSuggestions,
    };
  }

  /**
   * Admin Product Catalog query.
   * Can view all statuses (DRAFT, PUBLISHED, ARCHIVED, UNPUBLISHED).
   */
  public async findAdminProducts(
    options: ProductQueryOptions
  ): Promise<{ products: ProductDocument[]; total: number }> {
    const filter: FilterQuery<ProductDocument> = {};

    if (options.status) {
      filter.status = options.status;
    }
    if (options.category && Types.ObjectId.isValid(options.category)) {
      filter.categoryId = new Types.ObjectId(options.category);
    }
    if (options.brand) {
      filter.brand = new RegExp(`^${escapeRegex(options.brand)}$`, 'i');
    }
    if (options.search) {
      filter.$or = [
        { title: new RegExp(escapeRegex(options.search), 'i') },
        { sku: new RegExp(escapeRegex(options.search), 'i') },
        { brand: new RegExp(escapeRegex(options.search), 'i') },
      ];
    }

    const sortOption: Record<string, 1 | -1> = { createdAt: -1, _id: -1 };
    const skip = (options.page - 1) * options.limit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(options.limit)
        .populate('categoryId subCategoryId'),
      Product.countDocuments(filter),
    ]);

    return { products, total };
  }

  public async findFeatured(limit = 8): Promise<ProductDocument[]> {
    return Product.find({
      status: ProductStatus.PUBLISHED,
      featured: true,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate('categoryId subCategoryId');
  }

  public async findNewArrivals(limit = 8): Promise<ProductDocument[]> {
    return Product.find({
      status: ProductStatus.PUBLISHED,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate('categoryId subCategoryId');
  }

  public async findRelated(
    categoryId: string,
    excludeProductId: string,
    limit = 4
  ): Promise<ProductDocument[]> {
    if (!Types.ObjectId.isValid(categoryId)) return [];
    return Product.find({
      status: ProductStatus.PUBLISHED,
      categoryId: new Types.ObjectId(categoryId),
      _id: { $ne: new Types.ObjectId(excludeProductId) },
    })
      .sort({ averageRating: -1, createdAt: -1, _id: -1 })
      .limit(limit)
      .populate('categoryId subCategoryId');
  }

  public async addImage(productId: string, image: IProductImage): Promise<ProductDocument | null> {
    if (!Types.ObjectId.isValid(productId)) return null;
    if (image.isThumbnail) {
      // Clear isThumbnail on existing images atomically in MongoDB so the new image becomes the sole primary thumbnail
      await Product.updateOne(
        { _id: productId },
        { $set: { 'images.$[].isThumbnail': false } }
      );
    }
    return Product.findByIdAndUpdate(
      productId,
      { $push: { images: image } },
      { new: true }
    ).populate('categoryId subCategoryId');
  }

  public async removeImage(productId: string, publicId: string): Promise<ProductDocument | null> {
    if (!Types.ObjectId.isValid(productId)) return null;
    return Product.findByIdAndUpdate(
      productId,
      { $pull: { images: { publicId } } },
      { new: true }
    ).populate('categoryId subCategoryId');
  }

  public async setPrimaryImage(
    productId: string,
    publicId: string
  ): Promise<ProductDocument | null> {
    if (!Types.ObjectId.isValid(productId)) return null;
    const product = await Product.findById(productId);
    if (!product) return null;

    let found = false;
    product.images.forEach((img) => {
      if (img.publicId === publicId) {
        img.isThumbnail = true;
        found = true;
      } else {
        img.isThumbnail = false;
      }
    });

    if (!found) return null;
    await product.save();
    return product.populate('categoryId subCategoryId');
  }

  public async logAudit(data: {
    actorId: string;
    actorRole: string;
    action: string;
    entityId: string;
    ipAddress?: string;
    userAgent?: string;
    changesDiff?: { before?: unknown; after?: unknown };
  }): Promise<AuditLogDocument> {
    return AuditLog.create({
      actorId: new Types.ObjectId(data.actorId),
      actorRole: data.actorRole,
      action: data.action,
      entity: 'Product',
      entityId: new Types.ObjectId(data.entityId),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      changesDiff: data.changesDiff,
    });
  }
}

export const productRepository = new ProductRepository();
