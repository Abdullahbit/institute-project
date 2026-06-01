import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file for local development
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse({
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
});

if (!parsed.success) {
  console.error('❌ Invalid API environment variables:', parsed.error.format());
  throw new Error('Invalid API environment variables');
}

export const env = parsed.data;
