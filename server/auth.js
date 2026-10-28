import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { config } from './config.js';

const scryptAsync = promisify(scrypt);
export const COOKIE = 'stockist';

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const key = await scryptAsync(password, salt, 32);
  return `scrypt$${salt}$${key.toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const actual = await scryptAsync(String(password), salt, 32);
  const expected = Buffer.from(hash, 'base64url');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function signSession({ userId, role, account }) {
  const body = Buffer.from(JSON.stringify({
    userId,
    role,
    account,
    exp: Date.now() + config.sessionTtlMs,
  })).toString('base64url');
  const mac = createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function readSession(token) {
  if (!token || !token.includes('.')) return null;
  const dot = token.indexOf('.');
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
  const given = Buffer.from(mac);
  const check = Buffer.from(expected);
  if (given.length !== check.length || !timingSafeEqual(given, check)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.role !== 'retailer' && payload.role !== 'brand') return null;
    if (typeof payload.userId !== 'string' || !payload.userId) return null;
    if (typeof payload.account !== 'string' || !payload.account) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return { userId: payload.userId, role: payload.role, account: payload.account };
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  const parts = [
    `${COOKIE}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${Math.floor(config.sessionTtlMs / 1000)}`,
  ];
  if (config.production) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie() {
  const parts = [`${COOKIE}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
  if (config.production) parts.push('Secure');
  return parts.join('; ');
}
