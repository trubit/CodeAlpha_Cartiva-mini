import { Schema, model, type Document, type Model, Types } from 'mongoose';
import type { ICategory } from '@shared/models.types.js';

export interface CategoryDocument
  extends Omit<ICategory, '_id' | 'parentId' | 'createdBy' | 'updatedBy'>, Document {
  parentId?: Types.ObjectId | null;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required.'],
      trim: true,
      maxlength: [80, 'Category name cannot exceed 80 characters.'],
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Category slug must be kebab-case URL safe.'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [400, 'Category description cannot exceed 400 characters.'],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      validate: {
        validator: function (this: CategoryDocument, value: Types.ObjectId | null): boolean {
          if (!value) return true;
          return !this._id || !this._id.equals(value);
        },
        message: 'A category cannot be its own parent category.',
      },
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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
        delete ret['__v'];
        return ret;
      },
    },
  }
);

// Compound Index for hierarchical taxonomy navigation
categorySchema.index({ parentId: 1, displayOrder: 1 });

export const Category: Model<CategoryDocument> = model<CategoryDocument>(
  'Category',
  categorySchema
);
