import { Schema, model, type Document, type Model, Types } from 'mongoose';
import { ProductStatus } from '@shared/enums.js';
import type { IProduct } from '@shared/models.types.js';

export interface ProductDocument
  extends
    Omit<IProduct, '_id' | 'categoryId' | 'subCategoryId' | 'createdBy' | 'updatedBy'>,
    Document {
  categoryId: Types.ObjectId;
  subCategoryId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

const productImageSchema = new Schema(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    isThumbnail: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const productVariantSchema = new Schema(
  {
    sku: { type: String, required: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    attributes: { type: Map, of: Schema.Types.Mixed, default: {} },
    price: { type: Number, required: true, min: [0.01, 'Variant price must be at least 0.01'] },
    stockQuantity: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    isInventoryTracked: {
      type: Boolean,
      default: true,
    },
    imageUrl: { type: String },
  },
  { _id: true }
);

const productSchema = new Schema<ProductDocument>(
  {
    title: {
      type: String,
      required: [true, 'Product title is required.'],
      trim: true,
      maxlength: [180, 'Title cannot exceed 180 characters.'],
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be valid kebab-case.'],
    },
    previousSlugs: {
      type: [String],
      default: [],
    },
    sku: {
      type: String,
      required: [true, 'Product SKU is required.'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description is required.'],
      trim: true,
      maxlength: [300, 'Short description cannot exceed 300 characters.'],
    },
    fullDescription: {
      type: String,
      required: [true, 'Full description is required.'],
    },
    regularPrice: {
      type: Number,
      required: [true, 'Regular price is required.'],
      min: [0.01, 'Regular price must be greater than zero.'],
    },
    salePrice: {
      type: Number,
      min: [0, 'Sale price cannot be negative.'],
      validate: {
        validator: function (this: unknown, value?: number): boolean {
          if (value === undefined || value === null) return true;
          const context = this as {
            regularPrice?: number;
            getUpdate?: () => { regularPrice?: number; $set?: { regularPrice?: number } };
          };
          if (typeof context?.regularPrice === 'number') {
            return value <= context.regularPrice;
          }
          if (typeof context?.getUpdate === 'function') {
            const update = context.getUpdate();
            const regPrice = update?.regularPrice ?? update?.$set?.regularPrice;
            if (typeof regPrice === 'number') {
              return value <= regPrice;
            }
          }
          return true;
        },
        message: 'Sale price must be less than or equal to regular price.',
      },
    },
    saleStartDate: {
      type: Date,
    },
    saleEndDate: {
      type: Date,
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price cannot be negative.'],
      select: false, // Hidden from customer API queries
    },
    currency: {
      type: String,
      default: 'NGN',
      uppercase: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required.'],
      index: true,
    },
    subCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    images: {
      type: [productImageSchema],
      default: [],
    },
    hasVariants: {
      type: Boolean,
      default: false,
    },
    variants: {
      type: [productVariantSchema],
      default: [],
    },
    attributes: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required.'],
      min: [0, 'Stock quantity cannot be negative.'],
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative.'],
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    isInventoryTracked: {
      type: Boolean,
      default: true,
    },
    weightGrams: {
      type: Number,
      min: [0, 'Weight cannot be negative.'],
    },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: { type: String, default: 'cm' },
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.DRAFT,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
      keywords: { type: [String], default: [] },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret['id'] = ret['_id']?.toString();
        ret['name'] = ret['title'];
        delete ret['costPrice'];
        delete ret['__v'];
        return ret;
      },
    },
  }
);

// Compound Catalog & Filtering Indexes
productSchema.index({ categoryId: 1, status: 1, regularPrice: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ status: 1, brand: 1, regularPrice: 1 });
productSchema.index({ status: 1, regularPrice: 1 });
productSchema.index({ status: 1, featured: 1, averageRating: -1 });
productSchema.index({ 'variants.sku': 1 }, { sparse: true });
productSchema.index({ 'variants._id': 1 }, { sparse: true });
productSchema.index({ previousSlugs: 1 }, { sparse: true });
productSchema.index({ isInventoryTracked: 1, stockQuantity: 1, lowStockThreshold: 1 });

// Full-Text Search Index
productSchema.index(
  {
    title: 'text',
    shortDescription: 'text',
    brand: 'text',
    tags: 'text',
  },
  {
    weights: {
      title: 10,
      brand: 5,
      tags: 3,
      shortDescription: 1,
    },
    name: 'ProductTextSearchIndex',
  }
);

export const Product: Model<ProductDocument> = model<ProductDocument>('Product', productSchema);
