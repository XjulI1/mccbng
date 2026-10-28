import { setResponseStatus } from 'h3'
import { z } from 'zod'
import { defineApiHandler, serviceUnavailable, unprocessable } from '../../utils/errors'
import { loadCategories, loadCorrespondances, loadLibellesUsuels } from '../../utils/import/contexte'
import { detectDoublons, fenetreDoublons } from '../../utils/import/doublons'
import { getOperationExtractor } from '../../utils/import/extractor'
import { createLot, loadLot, purgeBrouillons, type SourceImport } from '../../utils/import/lots'
import { applyCorrespondances, normalizeLignes } from '../../utils/import/normalize'
import { consumeQuota } from '../../utils/import/quota'
import { assertCompteOwned, getCurrentUserId } from '../../utils/scope'
import { rawQuery } from '../../utils/sql'
import { parseBody } from '../../utils/validate'

const MAX_IMAGES = 20
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_TEXTE = 20_000

const id = z.preprocess(v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number().int().positive())
// Base64 brut (sans préfixe data:), taille décodée bornée
const base64Image = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/, 'invalid base64')
  .refine(data => Math.floor(data.length * 3 / 4) <= MAX_IMAGE_BYTES, `image larger than ${MAX_IMAGE_BYTES} bytes`)

const extractionBody = z.object({
  IDcompte: id,
  texte: z.string().max(MAX_TEXTE).optional(),
  images: z.array(z.object({ mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']), data: base64Image })).max(MAX_IMAGES).default([]),
  // Précisé par le front quand les images viennent d'une vidéo découpée
  Source: z.enum(['texte', 'image', 'video', 'mixte']).optional()
}).refine(body => body.images.length > 0 || Boolean(body.texte?.trim()), 'texte or images required')

const sourceDe = (body: z.output<typeof extractionBody>): SourceImport => {
  if (body.Source) return body.Source
  const texte = Boolean(body.texte?.trim())
  if (!body.images.length) return 'texte'
  return texte ? 'mixte' : 'image'
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10)

// Extraction par LLM d'une liste d'opérations, enregistrée comme lot en brouillon : aucune opération n'est créée ici.
// Les images et le texte source ne sont jamais persistés.
export default defineApiHandler(async (event) => {
  const userId = getCurrentUserId(event)
  const body = await parseBody(event, extractionBody)
  const extractor = getOperationExtractor()
  if (!extractor) throw serviceUnavailable('Import par IA indisponible : aucune clé Anthropic configurée')
  await assertCompteOwned(event, body.IDcompte)
  consumeQuota(userId)
  await purgeBrouillons(userId)

  const [categories, libellesUsuels, correspondances] = await Promise.all([
    loadCategories(userId), loadLibellesUsuels(userId), loadCorrespondances(userId)
  ])
  const categoriesLisibles = new Set(categories.map(c => c.IDcat))
  const now = new Date()

  const startedAt = Date.now()
  const log = (result: string, extra: Record<string, unknown> = {}) => console.info(JSON.stringify({
    event: 'import', result, IDuser: userId, images: body.images.length, texte: body.texte?.length ?? 0,
    dureeMs: Date.now() - startedAt, at: new Date().toISOString(), ...extra
  }))

  let extraction
  try {
    extraction = await extractor.extract({
      texte: body.texte,
      images: body.images,
      categories,
      libellesUsuels,
      // Le LLM n'a besoin que des renommages ; l'application déterministe utilise toutes les correspondances
      correspondances: correspondances.filter(c => c.NomOp !== c.LibelleSource),
      dateReference: isoDay(now)
    })
  } catch (error) {
    log('error', { statusCode: (error as { statusCode?: number }).statusCode ?? 500 })
    throw error
  }
  const usage = { modele: extraction.modele, tokensEntree: extraction.usage.input, tokensSortie: extraction.usage.output }

  const lignes = applyCorrespondances(normalizeLignes(extraction.lignes, categoriesLisibles, now), correspondances, categoriesLisibles)
  if (!lignes.length) {
    log('empty', usage)
    throw unprocessable('Aucune opération n\'a été trouvée dans le contenu envoyé')
  }

  const fenetre = fenetreDoublons(lignes)
  const existantes = await rawQuery<{ IDop: number; DateOp: Date; MontantOp: number }>(
    'SELECT IDop, DateOp, MontantOp FROM Operation WHERE IDcompte = ? AND MontantOp IN (?) AND DateOp BETWEEN ? AND ? ORDER BY IDop',
    [body.IDcompte, fenetre.montants, fenetre.debut, fenetre.fin]
  )
  const doublons = detectDoublons(lignes, existantes)

  const IDimport = await createLot(userId, {
    IDcompte: body.IDcompte, Source: sourceDe(body), Modele: extraction.modele.slice(0, 64),
    TokensEntree: extraction.usage.input, TokensSortie: extraction.usage.output
  }, lignes.map((ligne, i) => ({ ...ligne, ...doublons[i]! })))
  log('success', { IDimport, lignes: lignes.length, ...usage })

  setResponseStatus(event, 201)
  return loadLot(userId, IDimport)
})

