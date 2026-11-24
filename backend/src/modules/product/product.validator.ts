import { z } from 'zod';
import { ProductStatus, ProductSortOption, ProductAvailabilityFilter } from '@shared/enums.js';

// MongoDB ObjectId regex
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Kebab-case regex for slugs
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ============================================================================
// Category Validation Schemas
// ============================================================================

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required.' })
    .trim()
    .min(2, 'Category name must be at least 2 characters.')
    .max(80, 'Category name cannot exceed 80 characters.'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(slugRegex, 'Category slug must be valid kebab-case.')
    .optional(),
  description: z.string().trim().max(400, 'Description cannot exceed 400 characters.').optional(),
  parentId: z
    .string()
    .trim()
    .regex(objectIdRegex, 'Parent category ID must be a valid 24-character hexadecimal ObjectId.')
    .nullable()
    .optional(),
  imageUrl: z
    .string()
    .trim()
    .url('Invalid image URL.')
    .or(z.string().trim().startsWith('/'))
    .optional(),
  displayOrder: z.coerce
    .number()
    .int()
    .min(0, 'Display order must be zero or positive.')
    .optional(),
  isActive: z.boolean().optional(),
  seo: z
    .object({
      metaTitle: z.string().trim().max(100).optional(),
      metaDescription: z.string().trim().max(255).optional(),
      keywords: z.array(z.string().trim()).optional(),
    })
    .optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status flag is required.' }),
});

// ============================================================================
// Product Validation Schemas
// ============================================================================

const productDimensionSchema = z.object({
  length: z.coerce.number().min(0).optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  unit: z.string().trim().default('cm').optional(),
});

const productVariantInputSchema = z.object({
  sku: z.string().trim().min(2, 'Variant SKU must be at least 2 characters.').toUpperCase(),
  title: z.string().trim().min(2, 'Variant title is required.'),
  price: z.coerce.number().min(0.01, 'Variant price must be greater than zero.'),
  stockQuantity: z.coerce.number().int().min(0, 'Variant stock cannot be negative.').default(0),
  attributes: z.record(z.unknown()).default({}),
  imageUrl: z.string().trim().optional(),
});

export const createProductSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, 'Product title must be at least 2 characters.')
      .max(180, 'Product title cannot exceed 180 characters.')
      .optional(),
    name: z
      .string()
      .trim()
      .min(2, 'Product name must be at least 2 characters.')
      .max(180, 'Product name cannot exceed 180 characters.')
      .optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(slugRegex, 'Product slug must be valid kebab-case.')
      .optional(),
    sku: z
      .string({ required_error: 'Product SKU is required.' })
      .trim()
      .min(2, 'SKU must be at least 2 characters.')
      .max(50, 'SKU cannot exceed 50 characters.')
      .toUpperCase(),
    barcode: z.string().trim().max(50).optional(),
    brand: z.string().trim().max(100).optional(),
    shortDescription: z
      .string({ required_error: 'Short description is required.' })
      .trim()
      .min(5, 'Short description must be at least 5 characters.')
      .max(300, 'Short description cannot exceed 300 characters.'),
    fullDescription: z
      .string({ required_error: 'Full description is required.' })
      .trim()
      .min(10, 'Full description must be at least 10 characters.'),
    regularPrice: z.coerce
      .number({ required_error: 'Regular price is required.' })
      .min(0.01, 'Regular price must be greater than zero.'),
    salePrice: z.coerce.number().min(0, 'Sale price cannot be negative.').optional(),
    saleStartDate: z.string().datetime({ offset: true }).or(z.date()).optional(),
    saleEndDate: z.string().datetime({ offset: true }).or(z.date()).optional(),
    costPrice: z.coerce.number().min(0, 'Cost price cannot be negative.').optional(),
    currency: z.string().trim().length(3).toUpperCase().default('NGN').optional(),
    imageUrl: z.string().trim().url('Invalid image URL format.').optional(),
    categoryId: z
      .string({ required_error: 'Category ID is required.' })
      .trim()
      .regex(objectIdRegex, 'Category ID must be a valid 24-character hexadecimal ObjectId.'),
    subCategoryId: z
      .string()
      .trim()
      .regex(objectIdRegex, 'Subcategory ID must be a valid 24-character hexadecimal ObjectId.')
      .optional(),
    stockQuantity: z.coerce
      .number()
      .int()
      .min(0, 'Stock quantity cannot be negative.')
      .default(0)
      .optional(),
    lowStockThreshold: z.coerce
      .number()
      .int()
      .min(0, 'Low stock threshold cannot be negative.')
      .default(5)
      .optional(),
    weightGrams: z.coerce.number().min(0).optional(),
    dimensions: productDimensionSchema.optional(),
    status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT).optional(),
    featured: z.boolean().default(false).optional(),
    tags: z.array(z.string().trim()).default([]).optional(),
    attributes: z.record(z.unknown()).default({}).optional(),
    hasVariants: z.boolean().default(false).optional(),
    variants: z.array(productVariantInputSchema).default([]).optional(),
    seo: z
      .object({
        metaTitle: z.string().trim().max(100).optional(),
        metaDescription: z.string().trim().max(255).optional(),
        keywords: z.array(z.string().trim()).optional(),
      })
      .optional(),
  })
  .refine((data) => data.title || data.name, {
    message: 'Either product title or name must be provided.',
    path: ['title'],
  })
  .refine(
    (data) => {
      if (data.salePrice !== undefined && data.salePrice !== null) {
        return data.salePrice <= data.regularPrice;
      }
      return true;
    },
    {
      message: 'Sale price must be less than or equal to regular price.',
      path: ['salePrice'],
    }
  )
  .refine(
    (data) => {
      if (data.saleStartDate && data.saleEndDate) {
        return new Date(data.saleEndDate) > new Date(data.saleStartDate);
      }
      return true;
    },
    {
      message: 'Sale end date must be after sale start date.',
      path: ['saleEndDate'],
    }
  );

export const updateProductSchema = z
  .object({
    title: z.string().trim().min(2).max(180).optional(),
    name: z.string().trim().min(2).max(180).optional(),
    slug: z.string().trim().toLowerCase().regex(slugRegex).optional(),
    sku: z.string().trim().min(2).max(50).toUpperCase().optional(),
    barcode: z.string().trim().max(50).optional(),
    brand: z.string().trim().max(100).optional(),
    shortDescription: z.string().trim().min(5).max(300).optional(),
    fullDescription: z.string().trim().min(10).optional(),
    regularPrice: z.coerce.number().min(0.01).optional(),
    salePrice: z.coerce.number().min(0).nullable().optional(),
    saleStartDate: z.string().datetime({ offset: true }).or(z.date()).nullable().optional(),
    saleEndDate: z.string().datetime({ offset: true }).or(z.date()).nullable().optional(),
    costPrice: z.coerce.number().min(0).optional(),
    currency: z.string().trim().length(3).toUpperCase().optional(),
    categoryId: z.string().trim().regex(objectIdRegex).optional(),
    subCategoryId: z.string().trim().regex(objectIdRegex).nullable().optional(),
    stockQuantity: z.coerce.number().int().min(0).optional(),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
    weightGrams: z.coerce.number().min(0).optional(),
    dimensions: productDimensionSchema.optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    featured: z.boolean().optional(),
    tags: z.array(z.string().trim()).optional(),
    attributes: z.record(z.unknown()).optional(),
    hasVariants: z.boolean().optional(),
    variants: z.array(productVariantInputSchema).optional(),
    seo: z
      .object({
        metaTitle: z.string().trim().max(100).optional(),
        metaDescription: z.string().trim().max(255).optional(),
        keywords: z.array(z.string().trim()).optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.saleStartDate && data.saleEndDate) {
        return new Date(data.saleEndDate) > new Date(data.saleStartDate);
      }
      return true;
    },
    {
      message: 'Sale end date must be after sale start date.',
      path: ['saleEndDate'],
    }
  );

export const productStatusSchema = z.object({
  status: z.nativeEnum(ProductStatus, {
    required_error: 'Product status is required.',
  }),
});

export const productQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
    category: z.string().trim().optional(),
    subCategory: z.string().trim().optional(),
    brand: z.string().trim().optional(),
    minPrice: z.coerce.number().min(0, 'Minimum price cannot be negative.').optional(),
    maxPrice: z.coerce.number().min(0, 'Maximum price cannot be negative.').optional(),
    currency: z.string().trim().length(3).toUpperCase().optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    availability: z
      .nativeEnum(ProductAvailabilityFilter)
      .default(ProductAvailabilityFilter.ALL)
      .optional(),
    featured: z
      .string()
      .transform((val) => val === 'true')
      .or(z.boolean())
      .optional(),
    search: z.string().trim().max(100).optional(),
    q: z.string().trim().max(100).optional(),
    sort: z
      .nativeEnum(ProductSortOption)
      .default(ProductSortOption.NEWEST)
      .or(
        z
          .enum([
            'newest',
            'oldest',
            'price_asc',
            'price_desc',
            'name_asc',
            'name_desc',
            'rating',
            'popular',
            'relevance',
          ])
          .transform((val) => val as ProductSortOption)
      )
      .optional(),
    attributes: z.record(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.maxPrice >= data.minPrice;
      }
      return true;
    },
    {
      message: 'Maximum price must be greater than or equal to minimum price.',
      path: ['maxPrice'],
    }
  );

export const productSearchSchema = productQuerySchema;

export const productSuggestionSchema = z.object({
  q: z
    .string({ required_error: 'Search query is required.' })
    .trim()
    .min(1, 'Search query must be at least 1 character.')
    .max(100, 'Search query cannot exceed 100 characters.'),
  limit: z.coerce.number().int().min(1).max(15).default(5).optional(),
});
