import { randomBytes } from 'node:crypto'
import { useRuntimeConfig } from 'nitropack/runtime'

export type AnthropicEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type AppConfig = {
  db: { host: string; port: number; user: string; password: string; database: string }
  jwt: { secret: string; ttlSeconds: number }
  anthropic: { apiKey?: string; baseUrl?: string; model: string; effort: AnthropicEffort }
  isProduction: boolean
}

/** Server keys of the Nuxt runtime config, overridable at run time by the `NUXT_*` variables (values parsed by destr). */
export type ServerRuntimeConfig = {
  db?: { host?: unknown; port?: unknown; user?: unknown; password?: unknown; name?: unknown }
  jwt?: { secret?: unknown; ttlSeconds?: unknown }
  anthropic?: { apiKey?: unknown; baseUrl?: unknown; model?: unknown; effort?: unknown }
}

const DEFAULT_DB_PORT = 3306
const DEFAULT_TTL_SECONDS = 6 * 60 * 60
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5-5'
export const DEFAULT_ANTHROPIC_EFFORT: AnthropicEffort = 'low'
const EFFORTS: readonly AnthropicEffort[] = ['low', 'medium', 'high', 'xhigh', 'max']
const REQUIRED_DB_VARIABLES = [
  ['NUXT_DB_HOST', 'host'],
  ['NUXT_DB_USER', 'user'],
  ['NUXT_DB_PASSWORD', 'password'],
  ['NUXT_DB_NAME', 'database']
] as const

export const parseEffort = (value: string | undefined, fallback: AnthropicEffort = DEFAULT_ANTHROPIC_EFFORT): AnthropicEffort =>
  value && (EFFORTS as readonly string[]).includes(value) ? (value as AnthropicEffort) : fallback

const text = (value: unknown): string => (value === undefined || value === null ? '' : String(value))

const positiveInteger = (value: unknown, fallback: number): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

let ephemeralSecret: string | undefined

/** Validates the server runtime config; throws when a required value is missing. */
export const resolveConfig = (runtime: ServerRuntimeConfig, { production }: { production: boolean }): AppConfig => {
  const db = {
    host: text(runtime.db?.host),
    port: positiveInteger(runtime.db?.port, DEFAULT_DB_PORT),
    user: text(runtime.db?.user),
    password: text(runtime.db?.password),
    database: text(runtime.db?.name)
  }
  const configuredSecret = text(runtime.jwt?.secret)

  const missing: string[] = REQUIRED_DB_VARIABLES.filter(([, key]) => !db[key]).map(([name]) => name)
  if (production && !configuredSecret) missing.push('NUXT_JWT_SECRET')
  if (missing.length) throw new Error(`Configuration manquante : ${missing.join(', ')}`)

  const secret = configuredSecret || (ephemeralSecret ??= randomBytes(32).toString('hex'))

  return {
    db,
    jwt: { secret, ttlSeconds: positiveInteger(runtime.jwt?.ttlSeconds, DEFAULT_TTL_SECONDS) },
    anthropic: {
      apiKey: text(runtime.anthropic?.apiKey).trim() || undefined,
      baseUrl: text(runtime.anthropic?.baseUrl).trim() || undefined,
      model: text(runtime.anthropic?.model).trim() || DEFAULT_ANTHROPIC_MODEL,
      effort: parseEffort(text(runtime.anthropic?.effort).trim())
    },
    isProduction: production
  }
}

let cached: AppConfig | undefined

export const getConfig = (): AppConfig => (cached ??= resolveConfig(useRuntimeConfig(), { production: !import.meta.dev }))

export const hasEphemeralJwtSecret = () => ephemeralSecret !== undefined
