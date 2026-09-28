import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type IssuedCredentials = {
  clientId: string;
  clientSecret: string;
  secretHash: string;
  secretHint: string;
};

export function hashClientSecret(secret: string, pepper: string): string {
  return createHmac('sha256', pepper).update(secret, 'utf8').digest('hex');
}

export function issueCredentials(pepper: string): IssuedCredentials {
  const clientId = `sab_${randomBytes(12).toString('hex')}`;
  const clientSecret = `sbs_${randomBytes(32).toString('base64url')}`;
  return {
    clientId,
    clientSecret,
    secretHash: hashClientSecret(clientSecret, pepper),
    secretHint: clientSecret.slice(-8),
  };
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyClientSecret(secret: string, expectedHash: string, pepper: string): boolean {
  return safeEqual(hashClientSecret(secret, pepper), expectedHash);
}
