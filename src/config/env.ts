import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4100),
  PUBLIC_URL: z.string().url().default('https://chat.bizconnectacademy.com'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CLIENT_SECRET_PEPPER: z.string().min(32),
  ADMIN_API_KEY: z.string().min(24),
  JWT_ISSUER: z.string().default('sabito-bca'),
  JWT_AUDIENCE: z.string().default('sabito-platforms'),
  JWT_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  CORS_ORIGINS: z.string().default(''),
});

export const env = envSchema.parse(process.env);
const configuredOrigins = env.CORS_ORIGINS
  .split(',')
  .map((item) => item.trim().replace(/\/$/, ''))
  .filter(Boolean);
const developmentOrigins = env.NODE_ENV === 'production'
  ? []
  : [`http://localhost:${env.PORT}`, `http://127.0.0.1:${env.PORT}`];

export const corsOrigins = [
  ...new Set([
    ...configuredOrigins,
    env.PUBLIC_URL.replace(/\/$/, ''),
    ...developmentOrigins,
  ]),
];
