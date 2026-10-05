import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { getCookie, setCookie, type H3Event } from 'h3'
import { getDb } from '../db/client'
import { users } from '../db/schema'
import { getConfig } from './config'
import { unauthorized } from './errors'

export const AUTH_COOKIE_NAME = 'mccbngAuth'

const JWT_ALGORITHM = 'HS256'
const JWT_ISSUER = 'mccbng'
const JWT_AUDIENCE = 'mccbng'
const INVALID_TOKEN = 'Invalid or expired token'

export interface AuthProfile {
  name?: string
  email?: string
  IDuser: number
  /** tokenVersion de l'utilisateur à l'émission du jeton */
  tv: number
}

declare module 'h3' {
  interface H3EventContext {
    auth?: AuthProfile
  }
}

// Le JWT porte { name, email, IDuser, tv } : IDuser (numérique) scope toutes les données métier, tv permet la révocation.
export const signToken = (profile: AuthProfile): string => {
  const { jwt: cfg } = getConfig()
  return jwt.sign(
    { name: profile.name, email: profile.email, IDuser: profile.IDuser, tv: profile.tv },
    cfg.secret,
    { algorithm: JWT_ALGORITHM, issuer: JWT_ISSUER, audience: JWT_AUDIENCE, expiresIn: cfg.ttlSeconds }
  )
}

// La raison détaillée (expiration, signature, algorithme…) n'est jamais renvoyée au client.
export const verifyToken = (token: string): AuthProfile => {
  try {
    const decoded = jwt.verify(token, getConfig().jwt.secret, {
      algorithms: [JWT_ALGORITHM], issuer: JWT_ISSUER, audience: JWT_AUDIENCE
    }) as jwt.JwtPayload
    if (typeof decoded.IDuser !== 'number' || typeof decoded.tv !== 'number') throw new Error('missing IDuser or tv claim')
    return { name: decoded.name, email: decoded.email, IDuser: decoded.IDuser, tv: decoded.tv }
  } catch (error) {
    console.warn('[auth] token refusé :', (error as Error).message)
    throw unauthorized(INVALID_TOKEN)
  }
}

// Authentifie la requête par le cookie HttpOnly (seul support de session) et vérifie que le jeton n'a pas été révoqué.
export const authenticate = async (event: H3Event): Promise<AuthProfile> => {
  if (event.context.auth) return event.context.auth
  const token = getCookie(event, AUTH_COOKIE_NAME)
  if (!token) throw unauthorized(INVALID_TOKEN)
  const profile = verifyToken(token)
  const [user] = await getDb().select({ tokenVersion: users.tokenVersion }).from(users).where(eq(users.IDuser, profile.IDuser)).limit(1)
  if (!user || user.tokenVersion !== profile.tv) {
    console.warn('[auth] token refusé :', user ? 'tokenVersion périmée' : `utilisateur ${profile.IDuser} inexistant`)
    throw unauthorized(INVALID_TOKEN)
  }
  return (event.context.auth = profile)
}

// Profil déjà authentifié par le middleware (server/middleware/auth.ts).
export const requireAuth = (event: H3Event): AuthProfile => {
  if (!event.context.auth) throw unauthorized(INVALID_TOKEN)
  return event.context.auth
}

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
  secure: getConfig().isProduction
})

export const setAuthCookie = (event: H3Event, token: string) =>
  setCookie(event, AUTH_COOKIE_NAME, token, { ...cookieOptions(), maxAge: getConfig().jwt.ttlSeconds })

export const clearAuthCookie = (event: H3Event) => {
  setCookie(event, AUTH_COOKIE_NAME, '', { ...cookieOptions(), maxAge: 0 })
}
