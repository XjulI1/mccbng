import { getConfig } from '../config'
import { AnthropicOperationExtractor } from './anthropic-extractor'
import type { OperationExtractor } from './types'

let override: OperationExtractor | undefined
let cached: { key: string; extractor: OperationExtractor } | undefined

export const isImportDisponible = (): boolean => Boolean(override || getConfig().anthropic.apiKey)

// undefined si l'import est désactivé (pas de clé Anthropic)
export const getOperationExtractor = (): OperationExtractor | undefined => {
  if (override) return override
  const { apiKey, model, effort } = getConfig().anthropic
  if (!apiKey) return undefined
  const key = `${model}|${effort}`
  if (cached?.key !== key) cached = { key, extractor: new AnthropicOperationExtractor(apiKey, model, effort) }
  return cached.extractor
}

export const setOperationExtractor = (extractor: OperationExtractor | undefined) => {
  override = extractor
}
