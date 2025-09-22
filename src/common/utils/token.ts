import { createHmac, createHash, randomBytes } from 'crypto';

export type AccessTokenPayload = {
  sub: number;
  role: 'trainer' | 'trainee';
  iat: number;
  exp: number;
};

const DEFAULT_SECRET = 'development-secret-key';
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL ?? 60 * 15);
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL ?? 60 * 60 * 24 * 30);

function getSecret() {
  return process.env.APP_TOKEN_SECRET ?? DEFAULT_SECRET;
}

function base64UrlEncode(data: string) {
  return Buffer.from(data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(data: string) {
  data = data.replace(/-/g, '+').replace(/_/g, '/');
  const pad = data.length % 4;
  if (pad) {
    data += '='.repeat(4 - pad);
  }
  return Buffer.from(data, 'base64').toString('utf8');
}

export function generateAccessToken(payload: {
  sub: number;
  role: 'trainer' | 'trainee';
}, ttlSeconds: number = ACCESS_TOKEN_TTL_SECONDS) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const exp = issuedAt + ttlSeconds;
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify({ ...payload, iat: issuedAt, exp }));
  const signature = createHmac('sha256', getSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  const [headerPart, bodyPart, signature] = parts;
  const expectedSignature = createHmac('sha256', getSecret())
    .update(`${headerPart}.${bodyPart}`)
    .digest('base64url');
  if (expectedSignature !== signature) {
    throw new Error('Invalid token signature');
  }
  const payload = JSON.parse(base64UrlDecode(bodyPart)) as AccessTokenPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}

export function generateRefreshToken(ttlSeconds: number = REFRESH_TOKEN_TTL_SECONDS) {
  const token = randomBytes(48).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  return { token, expiresAt };
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
