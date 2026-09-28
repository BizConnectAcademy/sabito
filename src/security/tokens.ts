import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';

export type AccessClaims = JwtPayload & {
  sub: string;
  clientId: string;
  externalUserId: string;
  scope: string[];
};

export function signAccessToken(claims: Omit<AccessClaims, keyof JwtPayload>): string {
  return jwt.sign(claims, env.JWT_SECRET, {
    algorithm: 'HS256',
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresIn: env.JWT_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessClaims {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
  if (typeof payload === 'string' || !payload.sub || !payload.clientId || !payload.externalUserId) {
    throw new Error('Invalid access token claims.');
  }
  return payload as AccessClaims;
}
