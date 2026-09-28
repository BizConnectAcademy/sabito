import pino from 'pino';
import { env } from './config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.x-admin-key',
      'clientSecret',
      'client_secret',
      'accessToken',
      'access_token',
    ],
    censor: '[REDACTED]',
  },
});
