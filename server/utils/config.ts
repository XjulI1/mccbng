import { randomBytes } from 'node:crypto'

export type AnthropicEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface AppConfig {
  db: { host: string; port: number; user: string; password: string; database: string }
  jwt: { secret: string; ttlSeconds: number }
  // Import d'opérations par LLM : désactivé (sans erreur) quand la clé est absente
  anthropic: { apiKey?: string; model: string; effort: AnthropicEffort }
  isProduction: boolean
}

const DEFAULT_TTL_SECONDS = 6 * 60 * 60
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5-5'
export const DEFAULT_ANTHROPIC_EFFORT: AnthropicEffort = 'low'
const EFFORTS: readonly AnthropicEffort[] = ['low', 'medium', 'high', 'xhigh', 'max']

// Effort valide, sinon la valeur par défaut.
export const parseEffort = (value: string | undefined, fallback: AnthropicEffort = DEFAULT_ANTHROPIC_EFFORT): AnthropicEffort =>
  value && (EFFORTS as readonly string[]).includes(value) ? (value as AnthropicEffort) : fallback
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
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY?.trim() || undefined,
      model: env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL,
      effort: parseEffort(env.ANTHROPIC_EFFORT?.trim())
    },
    isProduction
  }
}

export const getConfig = (): AppConfig => (cached ??= loadConfig())

export const hasEphemeralJwtSecret = () => ephemeralSecret !== undefined
