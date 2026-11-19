// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_ANTHROPIC_EFFORT, DEFAULT_ANTHROPIC_MODEL, getConfig, parseEffort, resolveConfig, type ServerRuntimeConfig } from '../../server/utils/config'

const runtime = vi.hoisted(() => ({
  db: { host: 'db.local', port: 3307, user: 'u', password: 1234, name: 'mccbng' },
  jwt: { secret: 'runtime-secret', ttlSeconds: 600 },
  anthropic: { apiKey: 'sk-runtime', baseUrl: 'http://anthropic.local', model: 'claude-haiku-5-5', effort: 'high' }
}))

vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => runtime }))

const DB = { host: 'h', port: 3306, user: 'u', password: 'p', name: 'n' }
const resolve = (config: ServerRuntimeConfig, production = false) => resolveConfig({ db: DB, ...config }, { production })

describe('configuration de la base', () => {
  it('valeurs de la runtime config, nom de base lu dans db.name', () => {
    expect(resolve({}).db).toEqual({ host: 'h', port: 3306, user: 'u', password: 'p', database: 'n' })
  })

  it('valeurs converties par destr ramenées en chaînes, port invalide remplacé par 3306', () => {
    const config = resolveConfig({ db: { ...DB, password: 123456, port: 'abc' } }, { production: false })
    expect(config.db.password).toBe('123456')
    expect(config.db.port).toBe(3306)
  })

  it('valeurs obligatoires absentes : erreur nommant les variables NUXT_*', () => {
    expect(() => resolveConfig({ db: { ...DB, host: '', name: '' } }, { production: false }))
      .toThrow('Configuration manquante : NUXT_DB_HOST, NUXT_DB_NAME')
  })
})

describe('configuration JWT', () => {
  it('secret absent en production : erreur', () => {
    expect(() => resolve({ jwt: { secret: '' } }, true)).toThrow('Configuration manquante : NUXT_JWT_SECRET')
  })

  it('secret absent en développement : secret éphémère stable', () => {
    const first = resolve({}).jwt.secret
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(resolve({}).jwt.secret).toBe(first)
  })

  it('durée de vie par défaut de 6 h, ou celle de la runtime config', () => {
    expect(resolve({}).jwt.ttlSeconds).toBe(21600)
    expect(resolve({ jwt: { ttlSeconds: 0 } }).jwt.ttlSeconds).toBe(21600)
    expect(resolve({ jwt: { secret: 's', ttlSeconds: 3600 } }, true).jwt).toEqual({ secret: 's', ttlSeconds: 3600 })
  })
})

describe('configuration Anthropic', () => {
  it('clé absente en production : démarrage possible, import désactivé', () => {
    const config = resolve({ jwt: { secret: 's' } }, true)
    expect(config.anthropic).toEqual({ apiKey: undefined, baseUrl: undefined, model: DEFAULT_ANTHROPIC_MODEL, effort: DEFAULT_ANTHROPIC_EFFORT })
  })

  it('clé, URL, modèle et effort lus dans la runtime config', () => {
    const config = resolve({ anthropic: { apiKey: ' sk-test ', baseUrl: 'http://127.0.0.1:9000', model: 'claude-sonnet-5-5', effort: 'medium' } })
    expect(config.anthropic).toEqual({ apiKey: 'sk-test', baseUrl: 'http://127.0.0.1:9000', model: 'claude-sonnet-5-5', effort: 'medium' })
  })

  it('clé vide ou blanche : considérée absente', () => {
    expect(resolve({ anthropic: { apiKey: '  ' } }).anthropic.apiKey).toBeUndefined()
  })

  it('effort invalide remplacé par le défaut', () => {
    expect(parseEffort('extreme')).toBe(DEFAULT_ANTHROPIC_EFFORT)
    expect(parseEffort(undefined)).toBe(DEFAULT_ANTHROPIC_EFFORT)
    expect(parseEffort('xhigh')).toBe('xhigh')
  })
})

describe('getConfig', () => {
  it('lit useRuntimeConfig() et met le résultat en cache', () => {
    const config = getConfig()
    expect(config).toMatchObject({
      db: { host: 'db.local', port: 3307, user: 'u', password: '1234', database: 'mccbng' },
      jwt: { secret: 'runtime-secret', ttlSeconds: 600 },
      anthropic: { apiKey: 'sk-runtime', baseUrl: 'http://anthropic.local', model: 'claude-haiku-5-5', effort: 'high' }
    })
    expect(getConfig()).toBe(config)
  })
})
