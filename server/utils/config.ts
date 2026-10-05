import { randomBytes } from 'node:crypto'

export interface AppConfig {
  db: { host: string; port: number; user: string; password: string; database: string }
  jwt: { secret: string; ttlSeconds: number }
  isProduction: boolean
}

const DEFAULT_TTL_SECONDS = 6 * 60 * 60
const REQUIRED_DB_VARS = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] as const

let cached: AppConfig | undefined
let ephemeralSecret: string | undefined

// Lecture des variables d'environnement à l'exécution (jamais au build) : l'image Docker ne contient aucune configuration.
export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  const isProduction = env.NODE_ENV === 'production'
  const missing: string[] = REQUIRED_DB_VARS.filter(name => !env[name])
  if (isProduction && !env.JWT_SECRET) missing.push('JWT_SECRET')
  if (missing.length) throw new Error(`Configuration manquante : ${missing.join(', ')}`)

  let secret = env.JWT_SECRET
  if (!secret) {
    ephemeralSecret ??= randomBytes(32).toString('hex')
    secret = ephemeralSecret
  }

  const ttl = parseInt(env.JWT_TTL_SECONDS ?? '', 10)
  return {
    db: {
      host: env.DB_HOST ?? '',
      port: parseInt(env.DB_PORT ?? '3306', 10),
      user: env.DB_USER ?? '',
      password: env.DB_PASSWORD ?? '',
      database: env.DB_NAME ?? ''
    },
    jwt: { secret, ttlSeconds: Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_SECONDS },
    isProduction
  }
}

export const getConfig = (): AppConfig => (cached ??= loadConfig())

export const hasEphemeralJwtSecret = () => ephemeralSecret !== undefined
