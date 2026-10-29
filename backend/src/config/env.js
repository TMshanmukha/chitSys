import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('3306').transform((val) => parseInt(val, 10)),
  DB_NAME: z.string().default('chitfund_db'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_CONNECTION_LIMIT: z.string().default('10').transform((val) => parseInt(val, 10)),
  DB_SSL: z.enum(['true', 'false']).default('false'),
  AUTO_MIGRATE: z.enum(['true', 'false']).default('false'),

  JWT_SECRET: z.string().min(16).default('c8f8b3c98d6e4a2b10984f728190d65b71234a9e5c1284d728198f6230129abc'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  COOKIE_SECRET: z.string().default('98a123f890b45c2198034e782910fedcba1234567890abcdef1234567890abcd'),

  BOOTSTRAP_ADMIN_USERNAME: z.string().default('admin'),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().default('admin'),
  BOOTSTRAP_ADMIN_FULLNAME: z.string().default('Main Administrator'),
  BOOTSTRAP_ADMIN_PHONE: z.string().default('9876543210'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Critical Environment Configuration Error:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
