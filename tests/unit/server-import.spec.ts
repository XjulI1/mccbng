// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { AnthropicOperationExtractor } from '../../server/utils/import/anthropic-extractor'
import { detectDoublons, fenetreDoublons } from '../../server/utils/import/doublons'
import { getOperationExtractor, isImportDisponible, setOperationExtractor } from '../../server/utils/import/extractor'
import { applyCorrespondances, cleSource, normalizeLignes } from '../../server/utils/import/normalize'
import { buildContextText } from '../../server/utils/import/prompt'
import type { ExtractionInput, LigneExtraite } from '../../server/utils/import/types'

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const iso = (date: Date) => date.toISOString().slice(0, 10)
const ligne = (overrides: Partial<LigneExtraite> = {}): LigneExtraite => ({
  date: '2026-10-12', libelleSource: 'CB CARREFOUR 12/10', libelle: 'Courses Carrefour', montant: -45.3,
  idCategorie: 5, confiance: 'haute', dateIncertaine: false, ...overrides
})
const CATS = new Set([5, 7])
const REF = d('2026-10-28')

describe('cleSource', () => {
  it('retire préfixes bancaires, références, dates et numéros masqués', () => {
    expect(cleSource('CB CARREFOUR MARKET 12/10 CARTE 4974XXXX')).toBe('CARREFOUR MARKET')
    expect(cleSource('PRLV SEPA FREE MOBILE REF 8812')).toBe(cleSource('PRLV SEPA FREE MOBILE REF 9034'))
    expect(cleSource('PRLV SEPA FREE MOBILE REF 8812')).toBe('FREE MOBILE')
    expect(cleSource('Boulangerie Élise')).toBe('BOULANGERIE ELISE')
    expect(cleSource('12/10 4974')).toBe('')
  })
})

describe('normalizeLignes', () => {
  it('ligne valide conservée, montant arrondi, clé source calculée', () => {
    const [l] = normalizeLignes([ligne({ montant: -45.304 })], CATS, REF)
    expect(l).toMatchObject({ LibelleSource: 'CB CARREFOUR 12/10', CleSource: 'CARREFOUR', NomOp: 'Courses Carrefour', MontantOp: -45.3, IDcat: 5, Confiance: 'haute' })
    expect(iso(l!.DateOp)).toBe('2026-10-12')
  })

  it('catégorie hors liste : 0 et confiance faible', () => {
    expect(normalizeLignes([ligne({ idCategorie: 99 })], CATS, REF)[0]).toMatchObject({ IDcat: 0, Confiance: 'faible' })
  })

  it('date illisible : date du jour et confiance faible', () => {
    const [l] = normalizeLignes([ligne({ date: '12 oct.' })], CATS, REF)
    expect(iso(l!.DateOp)).toBe('2026-10-28')
    expect(l!.Confiance).toBe('faible')
  })

  it('date future de plus d\'un mois ramenée à l\'année précédente', () => {
    expect(iso(normalizeLignes([ligne({ date: '2026-12-24' })], CATS, REF)[0]!.DateOp)).toBe('2025-12-24')
    expect(iso(normalizeLignes([ligne({ date: '2026-11-20' })], CATS, REF)[0]!.DateOp)).toBe('2026-11-20')
  })

  it('date incertaine : confiance au plus moyenne', () => {
    expect(normalizeLignes([ligne({ dateIncertaine: true })], CATS, REF)[0]!.Confiance).toBe('moyenne')
  })

  it('libellé proposé vide : libellé source ; les deux vides : ligne ignorée', () => {
    expect(normalizeLignes([ligne({ libelle: ' ' })], CATS, REF)[0]!.NomOp).toBe('CB CARREFOUR 12/10')
    expect(normalizeLignes([ligne({ libelle: '', libelleSource: '' })], CATS, REF)).toEqual([])
  })
})

describe('applyCorrespondances', () => {
  it('reprend le libellé et la catégorie appris pour la même clé, la plus récente l\'emporte', () => {
    const lignes = normalizeLignes([ligne({ libelleSource: 'PRLV SEPA FREE MOBILE REF 9034', libelle: 'Free', idCategorie: 5, confiance: 'moyenne' })], CATS, REF)
    const [l] = applyCorrespondances(lignes, [
      { CleSource: 'FREE MOBILE', LibelleSource: 'PRLV SEPA FREE MOBILE REF 8812', NomOp: 'Forfait téléphone', IDcat: 7 },
      { CleSource: 'FREE MOBILE', LibelleSource: 'PRLV FREE MOBILE', NomOp: 'Ancien', IDcat: 5 }
    ], CATS)
    expect(l).toMatchObject({ NomOp: 'Forfait téléphone', IDcat: 7, Confiance: 'haute' })
  })

  it('catégorie apprise devenue illisible : libellé repris, catégorie proposée conservée', () => {
    const lignes = normalizeLignes([ligne({ confiance: 'moyenne' })], CATS, REF)
    const [l] = applyCorrespondances(lignes, [{ CleSource: 'CARREFOUR', LibelleSource: 'x', NomOp: 'Courses', IDcat: 42 }], CATS)
    expect(l).toMatchObject({ NomOp: 'Courses', IDcat: 5, Confiance: 'moyenne' })
  })
})

describe('detectDoublons', () => {
  const lignes = [
    { DateOp: d('2026-10-11'), MontantOp: -4.2 },
    { DateOp: d('2026-10-11'), MontantOp: -4.2 },
    { DateOp: d('2026-10-15'), MontantOp: -10 }
  ]

  it('opération existante à ±3 jours et même montant : doublon décoché, appariée une seule fois', () => {
    const result = detectDoublons(lignes, [
      { IDop: 1, DateOp: d('2026-10-10'), MontantOp: -4.2 },
      { IDop: 2, DateOp: d('2026-10-01'), MontantOp: -10 }
    ])
    expect(result[0]).toEqual({ IDopDoublon: 1, DoublonLot: false, Selection: false })
    expect(result[1]).toEqual({ IDopDoublon: null, DoublonLot: true, Selection: false })
    expect(result[2]).toEqual({ IDopDoublon: null, DoublonLot: false, Selection: true })
  })

  it('montant différent : pas de doublon', () => {
    expect(detectDoublons([lignes[2]!], [{ IDop: 3, DateOp: d('2026-10-15'), MontantOp: -10.01 }])[0]!.Selection).toBe(true)
  })

  it('fenêtre de recherche élargie de 3 jours', () => {
    const fenetre = fenetreDoublons(lignes)
    expect(iso(fenetre.debut)).toBe('2026-10-08')
    expect(fenetre.fin.toISOString()).toBe('2026-10-18T23:59:59.999Z')
    expect(fenetre.montants).toEqual([-4.2, -10])
  })
})

const input = (overrides: Partial<ExtractionInput> = {}): ExtractionInput => ({
  images: [], categories: [{ IDcat: 5, Nom: 'Courses', Type: 'depense' }], libellesUsuels: [{ NomOp: 'Courses Carrefour', IDcat: 5, occurrences: 12 }],
  correspondances: [{ CleSource: 'FREE MOBILE', LibelleSource: 'PRLV FREE MOBILE', NomOp: 'Forfait téléphone', IDcat: 7 }],
  dateReference: '2026-10-28', texte: 'CB CARREFOUR 12/10 -45,30', ...overrides
})

describe('buildContextText', () => {
  it('contient date, catégories, correspondances, libellés usuels et texte délimité', () => {
    const text = buildContextText(input())
    expect(text).toContain('Date de référence : 2026-10-28')
    expect(text).toContain('5 | Courses | depense')
    expect(text).toContain('PRLV FREE MOBILE → Forfait téléphone | 7')
    expect(text).toContain('Courses Carrefour | 5 | 12')
    expect(text).toContain('<texte_source>\nCB CARREFOUR 12/10 -45,30\n</texte_source>')
  })
})

// Réponse Messages API simulée (sortie structurée = bloc texte JSON)
const apiResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const message = (text: string, overrides: Record<string, unknown> = {}) => ({
  id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text }],
  stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 100, cache_creation_input_tokens: 0 },
  ...overrides
})
const extractor = (respond: (body: any) => Response, model = 'claude-opus-5-5') => {
  const requests: any[] = []
  const fetch = async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    requests.push(body)
    return respond(body)
  }
  return { requests, extractor: new AnthropicOperationExtractor('sk-test', model, 'low', { fetch: fetch as typeof globalThis.fetch, maxRetries: 0 }) }
}

describe('AnthropicOperationExtractor', () => {
  it('sortie valide : lignes, usage et modèle ; requête structurée avec fallbacks', async () => {
    const { requests, extractor: e } = extractor(() => apiResponse(message(JSON.stringify({ lignes: [ligne()] }))))
    const result = await e.extract(input({ images: [{ mediaType: 'image/jpeg', data: 'AAAA' }] }))
    expect(result).toEqual({ lignes: [ligne()], usage: { input: 1300, output: 300 }, modele: 'claude-opus-5-5' })
    const body = requests[0]
    expect(body).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default', output_config: { effort: 'low', format: { type: 'json_schema' } } })
    expect(body.tool_choice).toBeUndefined()
    expect(body.thinking).toBeUndefined()
    expect(body.messages[0].content[0]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } })
    expect(body.messages[0].content[1].type).toBe('text')
  })

  it('modèle sans repli serveur : pas de fallbacks', async () => {
    const { requests, extractor: e } = extractor(() => apiResponse(message(JSON.stringify({ lignes: [] }))), 'claude-haiku-5-5')
    await e.extract(input())
    expect(requests[0].fallbacks).toBeUndefined()
  })

  it('refus : 502', async () => {
    const { extractor: e } = extractor(() => apiResponse(message('', { stop_reason: 'refusal', content: [] })))
    await expect(e.extract(input())).rejects.toMatchObject({ statusCode: 502 })
  })

  it('sortie invalide : erreur, sans lignes', async () => {
    const { extractor: e } = extractor(() => apiResponse(message('{"lignes": [{"date": 1}]}')))
    await expect(e.extract(input())).rejects.toBeTruthy()
  })

  it('API surchargée (529) : 502 sans exposer la clé', async () => {
    const { extractor: e } = extractor(() => apiResponse({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }, 529))
    const error = await e.extract(input()).catch(err => err)
    expect(error).toMatchObject({ statusCode: 502 })
    expect(String(error.message)).not.toContain('sk-test')
  })
})

describe('disponibilité de l\x27import', () => {
  it('sans clé Anthropic : indisponible et aucun extracteur (la route répond 503)', () => {
    Object.assign(process.env, { DB_HOST: 'h', DB_PORT: '3306', DB_USER: 'u', DB_PASSWORD: 'p', DB_NAME: 'n' })
    delete process.env.ANTHROPIC_API_KEY
    expect(isImportDisponible()).toBe(false)
    expect(getOperationExtractor()).toBeUndefined()
  })

  it('extracteur injecté (tests, futur producteur MCP) : disponible', () => {
    const fake = { extract: async () => ({ lignes: [], usage: { input: 0, output: 0 }, modele: 'fake' }) }
    setOperationExtractor(fake)
    expect(isImportDisponible()).toBe(true)
    expect(getOperationExtractor()).toBe(fake)
    setOperationExtractor(undefined)
  })
})
