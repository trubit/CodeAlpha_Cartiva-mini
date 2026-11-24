import { Schema, model, type Document, type Model } from 'mongoose';
import { UserRole } from '@shared/enums.js';
import type { IUser } from '@shared/models.types.js';

export interface UserDocument extends Omit<IUser, '_id'>, Document {}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email address is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.'],
      maxlength: [255, 'Email cannot exceed 255 characters.'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required.'],
      select: false, // Never return password hash in queries by default
    },
    firstName: {
      type: String,
      required: [true, 'First name is required.'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters.'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required.'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters.'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid E.164 phone number.'],
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
      sparse: true,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    pendingEmail: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.'],
    },
    emailChangeToken: {
      type: String,
      select: false,
      sparse: true,
    },
    emailChangeExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
      sparse: true,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockUntil: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    deactivationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Deactivation reason cannot exceed 500 characters.'],
    },
    deletionRequestedAt: {
      type: Date,
    },
    deletionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Deletion reason cannot exceed 500 characters.'],
    },
    deletionStatus: {
      type: String,
      enum: ['none', 'pending', 'under_review', 'approved', 'rejected'],
      default: 'none',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret['passwordHash'];
        delete ret['passwordResetToken'];
        delete ret['passwordResetExpires'];
        delete ret['emailVerificationToken'];
        delete ret['emailVerificationExpires'];
        delete ret['emailChangeToken'];
        delete ret['emailChangeExpires'];
        delete ret['__v'];
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ createdAt: -1 });

export const User: Model<UserDocument> = model<UserDocument>('User', userSchema);
