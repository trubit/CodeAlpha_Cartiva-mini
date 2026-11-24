/**
 * Cartiva Mini — Fulfilment & Tracking Request Validation
 * Robust Zod validation schemas for shipments, status progression, tracking events, and exceptions.
 */
import { z } from 'zod';
import { OrderStatus, ShipmentStatus, TrackingEventSource, DeliveryExceptionType } from '@shared/enums.js';

export const createShipmentSchema = z.object({
  carrierName: z
    .string({ required_error: 'Carrier name is required.' })
    .trim()
    .min(2, 'Carrier name must be at least 2 characters.')
    .max(100, 'Carrier name cannot exceed 100 characters.'),
  carrierService: z.string().trim().max(100).optional(),
  trackingNumber: z
    .string()
    .trim()
    .min(3, 'Tracking number must be at least 3 characters.')
    .max(64, 'Tracking number cannot exceed 64 characters.')
    .optional(),
  trackingUrl: z.string().trim().url('Invalid tracking URL format.').optional().or(z.literal('')),
  estimatedDeliveryDate: z
    .string()
    .datetime({ message: 'Estimated delivery date must be a valid ISO-8601 datetime string.' })
    .optional(),
  deliveryNotes: z.string().trim().max(500, 'Delivery notes cannot exceed 500 characters.').optional(),
  dispatchNow: z.boolean().optional(),
});

export const updateShipmentSchema = createShipmentSchema.partial();

export const addTrackingEventSchema = z.object({
  status: z.nativeEnum(ShipmentStatus, {
    errorMap: () => ({ message: 'Invalid shipment status.' }),
  }),
  title: z
    .string({ required_error: 'Event title is required.' })
    .trim()
    .min(2, 'Event title must be at least 2 characters.')
    .max(100, 'Event title cannot exceed 100 characters.'),
  description: z
    .string({ required_error: 'Event description is required.' })
    .trim()
    .min(2, 'Event description must be at least 2 characters.')
    .max(500, 'Event description cannot exceed 500 characters.'),
  location: z.string().trim().max(100).optional(),
  timestamp: z.string().datetime().optional(),
  source: z.nativeEnum(TrackingEventSource).optional(),
});

export const deliveryConfirmationSchema = z.object({
  actualDeliveryDate: z.string().datetime().optional(),
  deliveredTo: z
    .string({ required_error: 'Recipient name/delivered-to is required for confirmation.' })
    .trim()
    .min(2, 'Delivered to name must be at least 2 characters.')
    .max(100, 'Delivered to name cannot exceed 100 characters.'),
  deliveryNotes: z.string().trim().max(500).optional(),
  proofOfDeliveryUrl: z.string().trim().url().optional().or(z.literal('')),
});

export const deliveryExceptionSchema = z.object({
  exceptionType: z.nativeEnum(DeliveryExceptionType, {
    errorMap: () => ({ message: 'Invalid delivery exception type.' }),
  }),
  description: z
    .string({ required_error: 'Exception description is required.' })
    .trim()
    .min(5, 'Description must be at least 5 characters.')
    .max(500, 'Description cannot exceed 500 characters.'),
  location: z.string().trim().max(100).optional(),
  rescheduledDeliveryDate: z.string().datetime().optional(),
  deliveryNotes: z.string().trim().max(500).optional(),
});

export const updateFulfilmentStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus, {
    errorMap: () => ({ message: 'Invalid order fulfilment status.' }),
  }),
  notes: z.string().trim().max(500).optional(),
  location: z.string().trim().max(100).optional(),
});

export const fulfilmentFilterSchema = z.object({
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
  carrier: z.string().trim().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
