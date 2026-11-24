import { z } from 'zod';
import { UserRole } from '@shared/enums.js';

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

export const updateProfileSchema = z
  .object({
    firstName: z
      .string({ invalid_type_error: 'First name must be a string.' })
      .trim()
      .min(2, 'First name must be at least 2 characters.')
      .max(50, 'First name cannot exceed 50 characters.')
      .optional(),
    lastName: z
      .string({ invalid_type_error: 'Last name must be a string.' })
      .trim()
      .min(2, 'Last name must be at least 2 characters.')
      .max(50, 'Last name cannot exceed 50 characters.')
      .optional(),
    phone: z
      .string({ invalid_type_error: 'Phone number must be a string.' })
      .trim()
      .regex(phoneRegex, 'Please provide a valid E.164 phone number (e.g. +2348012345678).')
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.firstName !== undefined || data.lastName !== undefined || data.phone !== undefined,
    {
      message: 'At least one field (firstName, lastName, or phone) must be provided for update.',
    }
  );

export const createAddressSchema = z
  .object({
    recipientName: z
      .string({ required_error: 'Recipient name is required.' })
      .trim()
      .min(2, 'Recipient name must be at least 2 characters.')
      .max(100, 'Recipient name cannot exceed 100 characters.'),
    phone: z
      .string({ required_error: 'Recipient phone number is required.' })
      .trim()
      .regex(phoneRegex, 'Please provide a valid E.164 phone number (e.g. +2348012345678).'),
    streetAddress: z
      .string({ required_error: 'Street address is required.' })
      .trim()
      .min(3, 'Street address must be at least 3 characters.')
      .max(200, 'Street address cannot exceed 200 characters.'),
    apartmentSuite: z
      .string()
      .trim()
      .max(50, 'Apartment or suite cannot exceed 50 characters.')
      .optional(),
    city: z
      .string({ required_error: 'City is required.' })
      .trim()
      .min(2, 'City must be at least 2 characters.')
      .max(100, 'City cannot exceed 100 characters.'),
    state: z
      .string({ required_error: 'State or region is required.' })
      .trim()
      .min(2, 'State or region must be at least 2 characters.')
      .max(100, 'State or region cannot exceed 100 characters.'),
    postalCode: z.string().trim().max(20, 'Postal code cannot exceed 20 characters.').optional(),
    country: z
      .string()
      .trim()
      .min(2, 'Country must be at least 2 characters.')
      .max(100, 'Country cannot exceed 100 characters.')
      .default('Nigeria'),
    deliveryInstructions: z
      .string()
      .trim()
      .max(500, 'Delivery instructions cannot exceed 500 characters.')
      .optional(),
    isDefault: z.boolean().optional().default(false),
  })
  .strict();

export const updateAddressSchema = z
  .object({
    recipientName: z
      .string()
      .trim()
      .min(2, 'Recipient name must be at least 2 characters.')
      .max(100, 'Recipient name cannot exceed 100 characters.')
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, 'Please provide a valid E.164 phone number (e.g. +2348012345678).')
      .optional(),
    streetAddress: z
      .string()
      .trim()
      .min(3, 'Street address must be at least 3 characters.')
      .max(200, 'Street address cannot exceed 200 characters.')
      .optional(),
    apartmentSuite: z
      .string()
      .trim()
      .max(50, 'Apartment or suite cannot exceed 50 characters.')
      .optional(),
    city: z
      .string()
      .trim()
      .min(2, 'City must be at least 2 characters.')
      .max(100, 'City cannot exceed 100 characters.')
      .optional(),
    state: z
      .string()
      .trim()
      .min(2, 'State or region must be at least 2 characters.')
      .max(100, 'State or region cannot exceed 100 characters.')
      .optional(),
    postalCode: z.string().trim().max(20, 'Postal code cannot exceed 20 characters.').optional(),
    country: z
      .string()
      .trim()
      .min(2, 'Country must be at least 2 characters.')
      .max(100, 'Country cannot exceed 100 characters.')
      .optional(),
    deliveryInstructions: z
      .string()
      .trim()
      .max(500, 'Delivery instructions cannot exceed 500 characters.')
      .optional(),
    isDefault: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one address field must be provided for update.',
  });

export const requestEmailChangeSchema = z
  .object({
    newEmail: z
      .string({ required_error: 'New email address is required.' })
      .trim()
      .email('Please provide a valid email address.')
      .max(255, 'Email cannot exceed 255 characters.')
      .toLowerCase(),
  })
  .strict();

export const verifyEmailChangeSchema = z
  .object({
    token: z
      .string({ required_error: 'Verification token is required.' })
      .trim()
      .length(64, 'Verification token must be a 64-character hexadecimal string.')
      .regex(/^[0-9a-f]{64}$/i, 'Invalid token format.'),
  })
  .strict();

export const deactivationRequestSchema = z
  .object({
    password: z
      .string({ required_error: 'Current account password is required for deactivation.' })
      .min(1, 'Password is required.'),
    reason: z
      .string()
      .trim()
      .max(500, 'Deactivation reason cannot exceed 500 characters.')
      .optional(),
  })
  .strict();

export const deletionRequestSchema = z
  .object({
    password: z
      .string({ required_error: 'Current account password is required for deletion request.' })
      .min(1, 'Password is required.'),
    reason: z
      .string({ required_error: 'Please provide a reason for the account deletion request.' })
      .trim()
      .min(5, 'Reason must be at least 5 characters.')
      .max(500, 'Reason cannot exceed 500 characters.'),
  })
  .strict();

export const adminUpdateUserStatusSchema = z
  .object({
    isActive: z.boolean({ required_error: 'Active status (boolean) is required.' }),
    reason: z
      .string({ required_error: 'An administrative reason is required for status changes.' })
      .trim()
      .min(3, 'Reason must be at least 3 characters.')
      .max(500, 'Reason cannot exceed 500 characters.'),
  })
  .strict();

export const adminCreateStaffSchema = z
  .object({
    email: z
      .string({ required_error: 'Email address is required.' })
      .trim()
      .email('Please provide a valid email address.')
      .toLowerCase(),
    password: z
      .string({ required_error: 'Password is required.' })
      .min(8, 'Password must be at least 8 characters.'),
    firstName: z
      .string({ required_error: 'First name is required.' })
      .trim()
      .min(2, 'First name must be at least 2 characters.')
      .max(50),
    lastName: z
      .string({ required_error: 'Last name is required.' })
      .trim()
      .min(2, 'Last name must be at least 2 characters.')
      .max(50),
    phone: z.string().trim().optional(),
    role: z.enum([UserRole.STAFF, UserRole.ADMIN], {
      required_error: 'Role must be either staff or admin.',
    }),
  })
  .strict();

export const adminUpdateStaffRoleSchema = z
  .object({
    role: z.enum([UserRole.STAFF, UserRole.ADMIN]).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const adminReviewDeletionRequestSchema = z
  .object({
    deletionStatus: z.enum(['approved', 'rejected'], {
      required_error: 'Status must be approved or rejected.',
    }),
    reason: z.string().max(500).optional(),
  })
  .strict();

