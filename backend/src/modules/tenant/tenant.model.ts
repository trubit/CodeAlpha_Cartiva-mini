import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
  tenantId: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'archived';
  type: 'platform' | 'company' | 'store' | 'vendor';
  domain?: string;
  settings?: {
    currency?: string;
    contactEmail?: string;
    supportPhone?: string;
    logoUrl?: string;
    brandColor?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_TENANT_ID = 'default-cartiva';

const tenantSchema = new Schema<ITenant>(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      default: DEFAULT_TENANT_ID,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'archived'],
      default: 'active',
      index: true,
    },
    type: {
      type: String,
      enum: ['platform', 'company', 'store', 'vendor'],
      default: 'company',
      index: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true,
    },
    settings: {
      currency: { type: String, default: 'NGN' },
      contactEmail: { type: String, trim: true, lowercase: true },
      supportPhone: { type: String, trim: true },
      logoUrl: { type: String, trim: true },
      brandColor: { type: String, default: '#101D3B' },
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

tenantSchema.index({ status: 1, type: 1 });

export const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);

