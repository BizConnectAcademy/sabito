import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { safeEqual } from '../security/credentials.js';

export function requireAdmin(request: Request, response: Response, next: NextFunction): void {
  const supplied = request.header('x-admin-key') ?? '';
  if (!safeEqual(supplied, env.ADMIN_API_KEY)) {
    response.status(401).json({ success: false, message: 'Invalid administrator credentials.' });
    return;
  }
  next();
}

export function parseBasicCredentials(header: string | undefined): {
  clientId: string;
  clientSecret: string;
} | null {
  if (!header?.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 1) return null;
    const clientId = decoded.slice(0, separator);
    const clientSecret = decoded.slice(separator + 1);
    return clientSecret ? { clientId, clientSecret } : null;
  } catch {
    return null;
  }
}
