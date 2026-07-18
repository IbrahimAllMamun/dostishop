import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:5174'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  // Public base URL of this API — used to build absolute URLs for locally-stored uploads
  API_PUBLIC_URL: z.string().default('http://localhost:4000'),
  // Public storefront URL — used in the Facebook catalog feed product links
  STORE_PUBLIC_URL: z.string().default('http://localhost:3000'),
  // Optional Cloudinary — when set, uploads go to Cloudinary instead of local disk
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim());

// Local upload directory (resolves to api/uploads in both dev and build)
export const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
