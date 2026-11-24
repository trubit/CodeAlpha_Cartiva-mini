import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type OtpPurpose = 'email_verification' | 'password_reset' | 'login_verification';

export interface OtpDocument extends Document {
  userId: Types.ObjectId;
  email: string;
  otpHash: string;
  purpose: OtpPurpose;
  attempts: number;
  maxAttempts: number;
  consumed: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<OtpDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required.'],
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required.'],
    },
    purpose: {
      type: String,
      enum: ['email_verification', 'password_reset', 'login_verification'],
      required: [true, 'OTP purpose is required.'],
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
      min: 1,
    },
    consumed: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required.'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast active OTP lookup
otpSchema.index({ email: 1, purpose: 1, consumed: 1 });
otpSchema.index({ userId: 1, purpose: 1, consumed: 1 });

// TTL Index: automatically expire and clean up documents after expiresAt
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp: Model<OtpDocument> = model<OtpDocument>('Otp', otpSchema);
