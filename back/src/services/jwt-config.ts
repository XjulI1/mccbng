// Centralised JWT configuration so that the same TTL is used for token
// generation and for the Set-Cookie Max-Age attribute.
//
// JWT_TTL_SECONDS — JWT expiration. Default: 1 hour.
// JWT_SECRET      — optional persistent secret. If not set, a fresh random
//                   secret is generated at boot (in application.ts) and all
//                   existing tokens are invalidated by a restart.

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

export function jwtTtlSeconds(): number {
  const raw = process.env.JWT_TTL_SECONDS;
  if (!raw) return DEFAULT_TTL_SECONDS;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS;
}
