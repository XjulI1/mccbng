import { describe, expect, it } from 'vitest'
import { DEFAULT_ANTHROPIC_EFFORT, DEFAULT_ANTHROPIC_MODEL, loadConfig, parseEffort } from '../../server/utils/config'

const DB = { DB_HOST: 'h', DB_PORT: '3306', DB_USER: 'u', DB_PASSWORD: 'p', DB_NAME: 'n' }

describe('configuration Anthropic', () => {
  it('clé absente en production : démarrage possible, import désactivé', () => {
    const config = loadConfig({ ...DB, NODE_ENV: 'production', JWT_SECRET: 's' })
    expect(config.anthropic).toEqual({ apiKey: undefined, model: DEFAULT_ANTHROPIC_MODEL, effort: DEFAULT_ANTHROPIC_EFFORT })
  })

  it('clé, modèle et effort lus depuis l\'environnement', () => {
    const config = loadConfig({ ...DB, ANTHROPIC_API_KEY: ' sk-test ', ANTHROPIC_MODEL: 'claude-sonnet-5-5', ANTHROPIC_EFFORT: 'medium' })
    expect(config.anthropic).toEqual({ apiKey: 'sk-test', model: 'claude-sonnet-5-5', effort: 'medium' })
  })

  it('clé vide ou blanche : considérée absente', () => {
    expect(loadConfig({ ...DB, ANTHROPIC_API_KEY: '  ' }).anthropic.apiKey).toBeUndefined()
  })

  it('effort invalide remplacé par le défaut', () => {
    expect(parseEffort('extreme')).toBe(DEFAULT_ANTHROPIC_EFFORT)
    expect(parseEffort(undefined)).toBe(DEFAULT_ANTHROPIC_EFFORT)
    expect(parseEffort('xhigh')).toBe('xhigh')
  })
})
