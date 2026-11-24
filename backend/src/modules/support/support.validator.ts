import { z } from 'zod';
import { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from '@shared/enums.js';

export const createSupportTicketSchema = z.object({
  subject: z
    .string()
    .min(3, 'Subject must be at least 3 characters.')
    .max(200, 'Subject cannot exceed 200 characters.')
    .trim(),
  category: z.nativeEnum(SupportTicketCategory),
  priority: z.nativeEnum(SupportTicketPriority).optional().default(SupportTicketPriority.MEDIUM),
  orderId: z.string().optional(),
  message: z
    .string()
    .min(5, 'Message must be at least 5 characters.')
    .max(3000, 'Message cannot exceed 3000 characters.')
    .trim(),
});

export const addTicketMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message content is required.')
    .max(3000, 'Message cannot exceed 3000 characters.'),
  attachments: z.array(z.string().url()).optional().default([]),
});

export const updateTicketStatusSchema = z.object({
  status: z.nativeEnum(SupportTicketStatus).optional(),
  priority: z.nativeEnum(SupportTicketPriority).optional(),
  assignedTo: z.string().optional(),
});
