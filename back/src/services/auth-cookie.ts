// Builds the Set-Cookie header used to send the JWT back to the browser.
// Flags applied:
//   HttpOnly  — JS cannot read the cookie (mitigates token theft via XSS).
//   Secure    — only sent over HTTPS in production.
//   SameSite=Strict — blocks cross-site requests from carrying the cookie.
//   Path=/    — available to every API route under the same origin.
//   Max-Age   — must mirror the JWT TTL so the browser drops the cookie when
//               the token expires.

import {jwtTtlSeconds} from './jwt-config';

const COOKIE_NAME = 'mccbngAuth';

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

export function buildAuthCookie(token: string): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${jwtTtlSeconds()}`,
  ];
  if (isProduction()) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function clearAuthCookie(): string {
  const parts = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=0',
  ];
  if (isProduction()) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export {COOKIE_NAME as AUTH_COOKIE_NAME};
