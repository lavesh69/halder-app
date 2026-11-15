import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().min(16).default('halder_super_secure_jwt_secret_production_2026_mandi'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DB_PATH: z.string().default(path.resolve(process.cwd(), 'server', 'halder.db')),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:4173,http://localhost:3000'),
  UPLOAD_DIR: z.string().default(path.resolve(process.cwd(), 'server', 'uploads')),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(300),
  PHONEPE_MERCHANT_ID: z.string().default('PGTESTPAYUAT'),
  PHONEPE_SALT_KEY: z.string().default('099eb0cd-02cf-4e2a-8aca-3e6c6aff0399'),
  PHONEPE_SALT_INDEX: z.string().default('1'),
  PHONEPE_ENV: z.enum(['UAT', 'PROD']).default('UAT'),
  PHONEPE_HOST_URL: z.string().default('https://api-preprod.phonepe.com/apis/pg-sandbox'),
  PAYTM_MID: z.string().default('DIY12386817555501617'),
  PAYTM_MERCHANT_KEY: z.string().default('bKMfNxPPBoqON&5m'),
  PAYTM_ENV: z.enum(['UAT', 'PROD']).default('UAT'),
  PAYTM_WEBSITE: z.string().default('WEBSTAGING'),
  GPAY_MERCHANT_ID: z.string().default('HALDER_MANDI_GPAY_UAT'),

  // Cloud Storage (AWS S3 / Cloudflare R2)
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_S3_BUCKET: z.string().default('halder-production-media'),
  AWS_S3_ENDPOINT: z.string().optional(), // For Cloudflare R2 or MinIO

  // Public Server & Webhook URL (For Production Domain)
  PUBLIC_SERVER_URL: z.string().default('http://localhost:5000'),

  // Real SMS Gateway (Fast2SMS / Twilio / MSG91)
  SMS_PROVIDER: z.enum(['console', 'fast2sms', 'twilio', 'msg91']).default('console'),
  FAST2SMS_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
