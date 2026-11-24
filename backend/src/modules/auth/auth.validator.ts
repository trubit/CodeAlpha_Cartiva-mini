import { z } from 'zod';

const passwordComplexityRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/~`])[A-Za-z\d@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/~`]{8,}$/;

const passwordComplexityMessage =
  'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.';

export const registerSchema = z
  .object({
    firstName: z
      .string({ required_error: 'First name is required.' })
      .trim()
      .min(1, 'First name is required.')
      .max(50, 'First name cannot exceed 50 characters.'),
    lastName: z
      .string({ required_error: 'Last name is required.' })
      .trim()
      .min(1, 'Last name is required.')
      .max(50, 'Last name cannot exceed 50 characters.'),
    email: z
      .string({ required_error: 'Email address is required.' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address.')
      .max(255, 'Email cannot exceed 255 characters.'),
    password: z
      .string({ required_error: 'Password is required.' })
      .min(8, 'Password must be at least 8 characters long.')
      .max(100, 'Password cannot exceed 100 characters.')
      .regex(passwordComplexityRegex, passwordComplexityMessage),
    confirmPassword: z
      .string({ required_error: 'Password confirmation is required.' })
      .min(1, 'Please confirm your password.'),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number (e.g. +2348012345678).')
      .optional(),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email address is required.' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address.'),
    password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.'),
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    token: z
      .string({ required_error: 'Verification token is required.' })
      .trim()
      .min(1, 'Token is required.'),
  })
  .strict();

export const resendVerificationSchema = z
  .object({
    email: z
      .string({ required_error: 'Email address is required.' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address.'),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z
      .string({ required_error: 'Email address is required.' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address.'),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z
      .string({ required_error: 'Reset token is required.' })
      .trim()
      .min(1, 'Token is required.'),
    password: z
      .string({ required_error: 'New password is required.' })
      .min(8, 'Password must be at least 8 characters long.')
      .max(100, 'Password cannot exceed 100 characters.')
      .regex(passwordComplexityRegex, passwordComplexityMessage),
    confirmPassword: z
      .string({ required_error: 'Password confirmation is required.' })
      .min(1, 'Please confirm your password.'),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required.' })
      .min(1, 'Current password is required.'),
    newPassword: z
      .string({ required_error: 'New password is required.' })
      .min(8, 'New password must be at least 8 characters long.')
      .max(100, 'New password cannot exceed 100 characters.')
      .regex(passwordComplexityRegex, passwordComplexityMessage),
    confirmPassword: z
      .string({ required_error: 'Password confirmation is required.' })
      .min(1, 'Please confirm your new password.'),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const sessionParamSchema = z
  .object({
    id: z
      .string({ required_error: 'Session ID is required.' })
      .trim()
      .min(1, 'Session ID cannot be empty.'),
  })
  .strict();

export const verifyOtpSchema = z
  .object({
    email: z
      .string({ required_error: 'Email address is required.' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address.'),
    otp: z
      .string({ required_error: '6-digit verification code is required.' })
      .trim()
      .length(6, 'Verification code must be exactly 6 digits.')
      .regex(/^\d{6}$/, 'Verification code must contain digits only.'),
    purpose: z
      .enum(['email_verification', 'password_reset', 'login_verification'])
      .optional()
      .default('email_verification'),
  })
  .strict();

export const resendOtpSchema = z
  .object({
    email: z
      .string({ required_error: 'Email address is required.' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address.'),
    purpose: z
      .enum(['email_verification', 'password_reset', 'login_verification'])
      .optional()
      .default('email_verification'),
  })
  .strict();
