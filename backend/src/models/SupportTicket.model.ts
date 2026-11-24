import { Schema, model, type Document, type Model, Types } from 'mongoose';
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  UserRole,
} from '@shared/enums.js';
import type { ISupportTicket } from '@shared/models.types.js';

export interface SupportTicketDocument
  extends Omit<ISupportTicket, '_id' | 'userId' | 'orderId' | 'assignedTo'>, Document {
  userId: Types.ObjectId;
  orderId?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
}

const supportMessageSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required.'],
      trim: true,
      maxlength: [3000, 'Message cannot exceed 3000 characters.'],
    },
    attachments: {
      type: [String],
      default: [],
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const supportTicketSchema = new Schema<SupportTicketDocument>(
  {
    ticketNumber: {
      type: String,
      required: [true, 'Ticket number is required.'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    subject: {
      type: String,
      required: [true, 'Subject is required.'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters.'],
    },
    category: {
      type: String,
      enum: Object.values(SupportTicketCategory),
      required: [true, 'Category is required.'],
    },
    priority: {
      type: String,
      enum: Object.values(SupportTicketPriority),
      default: SupportTicketPriority.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(SupportTicketStatus),
      default: SupportTicketStatus.OPEN,
      index: true,
    },
    messages: {
      type: [supportMessageSchema],
      default: [],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

supportTicketSchema.index({ userId: 1, status: 1, updatedAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, updatedAt: -1 });

export const SupportTicket: Model<SupportTicketDocument> = model<SupportTicketDocument>(
  'SupportTicket',
  supportTicketSchema
);
