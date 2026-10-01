import jwt from 'jsonwebtoken'
import { getHeader, setCookie, type H3Event } from 'h3'
import { getConfig } from './config'
import { unauthorized } from './errors'

export const AUTH_COOKIE_NAME = 'mccbngAuth'

export interface AuthProfile {
  id: string
  name?: string
  email?: string
  IDuser: number
}

declare module 'h3' {
  interface H3EventContext {
    auth?: AuthProfile
  }
}

// Le JWT porte { id, name, email, IDuser } : IDuser (numérique) scope toutes les données métier.
export const signToken = (profile: AuthProfile): string => {
  const { jwt: cfg } = getConfig()
  return jwt.sign(
    { id: profile.id, name: profile.name, email: profile.email, IDuser: profile.IDuser },
    cfg.secret,
    { expiresIn: cfg.ttlSeconds }
  )
}

export const verifyToken = (token: string): AuthProfile => {
  if (!token) throw unauthorized(`Error verifying token : 'token' is null`)
  try {
    const decoded = jwt.verify(token, getConfig().jwt.secret) as jwt.JwtPayload
    return { id: decoded.id, name: decoded.name, email: decoded.email, IDuser: decoded.IDuser }
  } catch (error) {
    throw unauthorized(`Error verifying token : ${(error as Error).message}`)
  }
}

// Extrait le token du header Authorization: Bearer <jwt>.
export const extractBearer = (event: H3Event): string | undefined => {
  const header = getHeader(event, 'authorization')
  if (!header) return undefined
  const [scheme, token, ...rest] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length) return undefined
  return token
}

export const requireAuth = (event: H3Event): AuthProfile => {
  if (event.context.auth) return event.context.auth
  const token = extractBearer(event)
  if (!token) throw unauthorized('Authorization header not found.')
  return (event.context.auth = verifyToken(token))
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
