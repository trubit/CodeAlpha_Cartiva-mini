import { Schema, model, type Document, type Model, Types } from 'mongoose';

export interface SearchAnalyticsDocument extends Document {
  query: string;
  resultCount: number;
  userId?: Types.ObjectId;
  sessionId?: string;
  filters?: Record<string, unknown>;
  anonymizedIp?: string;
  userAgent?: string;
  timestamp: Date;
}

const searchAnalyticsSchema = new Schema<SearchAnalyticsDocument>(
  {
    query: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
      index: true,
    },
    resultCount: {
      type: Number,
      required: true,
      min: 0,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    sessionId: {
      type: String,
      trim: true,
      maxlength: 100,
      sparse: true,
    },
    filters: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    anonymizedIp: {
      type: String,
      trim: true,
      maxlength: 64,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound query index for search trend analysis
searchAnalyticsSchema.index({ query: 1, timestamp: -1 });

// TTL retention index: automatically purges analytics records after 90 days
searchAnalyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const SearchAnalytics: Model<SearchAnalyticsDocument> = model<SearchAnalyticsDocument>(
  'SearchAnalytics',
  searchAnalyticsSchema
);
