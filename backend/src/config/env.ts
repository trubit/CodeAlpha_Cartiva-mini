import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  FRONTEND_URL: z.string().default('http://localhost:5180'),
  BACKEND_URL: z.string().default('http://localhost:5000'),

  MONGODB_URI: z.string().default('mongodb://localhost:27017/cartiva-mini'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(16)
    .default('cartiva_mini_dev_jwt_access_secret_key_32chars_min'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16)
    .default('cartiva_mini_dev_jwt_refresh_secret_key_32chars_min'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  PAYSTACK_SECRET_KEY: z.string().default('sk_test_placeholder_for_development'),
  PAYSTACK_PUBLIC_KEY: z.string().default('pk_test_placeholder_for_development'),
  PAYSTACK_WEBHOOK_SECRET: z.string().default(''),
  PAYSTACK_BASE_URL: z.string().default('https://api.paystack.co'),

  CLOUDINARY_CLOUD_NAME: z.string().default('cartiva_dev_cloud'),
  CLOUDINARY_API_KEY: z.string().default('placeholder_api_key'),
  CLOUDINARY_API_SECRET: z.string().default('placeholder_api_secret'),

  EMAIL_HOST: z.string().default('smtp.mailtrap.io'),
  EMAIL_PORT: z.coerce.number().default(2525),
  EMAIL_USER: z.string().default('placeholder_smtp_user'),
  EMAIL_PASSWORD: z.string().default('placeholder_smtp_password'),
  EMAIL_FROM: z.string().default('Cartiva Mini <noreply@cartivamini.com>'),
  ADMIN_EMAIL: z.string().email().default('admin@cartivamini.com'),

  BREVO_API_KEY: z.string().optional(),

  OTP_EXPIRATION_MINUTES: z.coerce.number().default(30),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsedEnv.error.format());
  throw new Error('Environment variable validation failed.');
}

export const env = parsedEnv.data;
export type EnvConfig = typeof env;
