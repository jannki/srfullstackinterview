import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, original] = stored.split(':');
  if (!salt || !original) {
    return false;
  }
  const derived = scryptSync(password, salt, 64).toString('hex');
  const originalBuffer = Buffer.from(original, 'hex');
  const derivedBuffer = Buffer.from(derived, 'hex');
  if (originalBuffer.length !== derivedBuffer.length) {
    return false;
  }
  return timingSafeEqual(originalBuffer, derivedBuffer);
}
