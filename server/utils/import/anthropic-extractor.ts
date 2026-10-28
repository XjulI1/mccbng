import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { AnthropicEffort } from '../config'
import { badGateway } from '../errors'
import { buildContextText, SYSTEM_PROMPT } from './prompt'
import { ExtractionSchema, type ExtractionInput, type ExtractionResult, type OperationExtractor } from './types'

const MAX_TOKENS = 16000
// Sous le plafond d'environ 100 s de Cloudflare
const TIMEOUT_MS = 90_000
// Repli automatique sur refus d'une catégorie de sécurité : seuls ces modèles acceptent `fallbacks: 'default'`
const FALLBACK_MODELS = new Set(['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'])
const FALLBACK_BETA = 'server-side-fallback-2026-07-01'

// Extraction par l'API Claude : toutes les images dans un seul message utilisateur, sortie JSON structurée validée par Zod.
// Pas de tool_choice forcé (refusé avec une 400 par les modèles récents) ni de `thinking` désactivé : l'effort règle la profondeur.
export class AnthropicOperationExtractor implements OperationExtractor {
  private readonly client: Anthropic

  // clientOptions : surcharge pour les tests (fetch simulé)
  constructor(apiKey: string, private readonly model: string, private readonly effort: AnthropicEffort, clientOptions: Partial<ConstructorParameters<typeof Anthropic>[0]> = {}) {
    this.client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1, ...clientOptions })
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [
      ...input.images.map(image => ({
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: image.mediaType, data: image.data }
      })),
      { type: 'text', text: buildContextText(input) }
    ]
    const fallback = FALLBACK_MODELS.has(this.model)

    let message
    try {
      message = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: MAX_TOKENS,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        output_config: { effort: this.effort, format: betaZodOutputFormat(ExtractionSchema) },
        messages: [{ role: 'user', content }],
        ...(fallback ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const } : {})
      })
    } catch (error) {
      // Ni la clé ni le contenu de la requête ne sont exposés
      if (error instanceof Anthropic.RateLimitError) throw badGateway('Service d\'IA saturé, réessayez dans un instant')
      if (error instanceof Anthropic.APIError) {
        console.error('[import] API Anthropic', error.status ?? 'réseau', error.message)
        throw badGateway('Le service d\'IA n\'a pas pu traiter la demande, réessayez')
      }
      throw error
    }

    if (message.stop_reason === 'refusal') throw badGateway('Le service d\'IA a refusé de traiter ce contenu')
    if (message.stop_reason === 'max_tokens') throw badGateway('Trop d\'opérations dans un seul envoi : découpez la source')
    if (!message.parsed_output) throw badGateway('Réponse du service d\'IA inexploitable, réessayez')

    const usage = message.usage
    return {
      lignes: message.parsed_output.lignes,
      usage: {
        input: (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
        output: usage.output_tokens ?? 0
      },
      modele: message.model
    }
  }
}
