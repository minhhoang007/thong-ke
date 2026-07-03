import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

function safeEqual(actual, expected) {
  const a = Buffer.from(String(actual ?? ''));
  const b = Buffer.from(String(expected ?? ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hasAdminCredentials() {
  return Boolean(env.ADMIN_USERNAME && env.ADMIN_PASSWORD);
}

export function isAdminRequest(request) {
  if (!hasAdminCredentials()) return false;
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return false;

  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return false;
    return safeEqual(decoded.slice(0, separator), env.ADMIN_USERNAME)
      && safeEqual(decoded.slice(separator + 1), env.ADMIN_PASSWORD);
  } catch {
    return false;
  }
}

export function isCronRequest(request) {
  return Boolean(env.CRON_SECRET)
    && safeEqual(request.headers.get('x-cron-secret'), env.CRON_SECRET);
}
