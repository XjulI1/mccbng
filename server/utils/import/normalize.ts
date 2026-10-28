import { round2 } from '../money'
import { startOfUtcDay } from '../schedule'
import type { Confiance, Correspondance, LigneExtraite } from './types'

const LIBELLE_SOURCE_MAX = 255
const NOM_OP_MAX = 512
const DAY_MS = 24 * 60 * 60 * 1000
// Une échéance générée par anticipation peut être datée jusqu'à un mois plus tard
const FUTURE_MAX_DAYS = 31

// Mots techniques ajoutés par les banques, sans valeur pour reconnaître le marchand
const MOTS_BANCAIRES = new Set([
  'CB', 'CARTE', 'PRLV', 'PRELEVEMENT', 'PRELEV', 'SEPA', 'VIR', 'VIREMENT', 'INST', 'PAIEMENT', 'PAIE', 'ACHAT',
  'RETRAIT', 'DAB', 'REF', 'REFERENCE', 'ECH', 'ECHEANCE', 'FACTURE', 'FAC', 'DE', 'DU', 'LE', 'LA', 'LES', 'PAR', 'EN', 'AU',
  'MANDAT', 'ID', 'EMETTEUR', 'BENEF', 'MOTIF', 'FRAIS', 'COMMISSION', 'TPE'
])

// Clé de comparaison d'un libellé de relevé : majuscules sans accents, sans mots bancaires, références, dates ni numéros.
// « PRLV SEPA FREE MOBILE REF 8812 » et « PRLV SEPA FREE MOBILE REF 9034 » donnent tous deux « FREE MOBILE ».
export const cleSource = (libelle: string): string =>
  libelle
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .split(' ')
    .filter(mot => mot && !/\d/.test(mot) && !/^X{3,}$/.test(mot) && !MOTS_BANCAIRES.has(mot))
    .join(' ')
    .slice(0, LIBELLE_SOURCE_MAX)

export interface LigneNormalisee {
  DateOp: Date
  LibelleSource: string
  CleSource: string
  NomOp: string
  MontantOp: number
  IDcat: number
  Confiance: Confiance
}

const RANG: Record<Confiance, number> = { haute: 2, moyenne: 1, faible: 0 }
const auPlus = (confiance: Confiance, plafond: Confiance): Confiance => (RANG[confiance] > RANG[plafond] ? plafond : confiance)

// Date AAAA-MM-JJ valide, ramenée à l'année précédente si elle dépasse la référence de plus d'un mois.
const parseDate = (value: string, reference: Date): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return undefined
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const build = (y: number) => {
    const date = new Date(Date.UTC(y, month - 1, day))
    return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : undefined
  }
  const date = build(year)
  if (!date) return undefined
  const limit = reference.getTime() + FUTURE_MAX_DAYS * DAY_MS
  if (date.getTime() <= limit) return date
  const previous = build(year - 1)
  return previous && previous.getTime() <= limit ? previous : undefined
}

// Normalise la sortie du LLM : le serveur reste maître des formats et de l'appartenance des catégories.
export const normalizeLignes = (lignes: LigneExtraite[], categoriesLisibles: Set<number>, reference: Date): LigneNormalisee[] => {
  const today = startOfUtcDay(reference)
  const result: LigneNormalisee[] = []
  for (const ligne of lignes) {
    const libelleSource = (ligne.libelleSource.trim() || ligne.libelle.trim()).slice(0, LIBELLE_SOURCE_MAX)
    const nomOp = (ligne.libelle.trim() || libelleSource).slice(0, NOM_OP_MAX)
    if (!nomOp || !Number.isFinite(ligne.montant)) continue

    let confiance = ligne.confiance
    let date = parseDate(ligne.date, today)
    if (!date) {
      date = today
      confiance = 'faible'
    } else if (ligne.dateIncertaine) {
      confiance = auPlus(confiance, 'moyenne')
    }

    const montant = round2(ligne.montant)
    if (montant === 0) confiance = 'faible'

    let idcat = ligne.idCategorie
    if (idcat !== 0 && !categoriesLisibles.has(idcat)) {
      idcat = 0
      confiance = 'faible'
    }

    result.push({ DateOp: date, LibelleSource: libelleSource, CleSource: cleSource(libelleSource), NomOp: nomOp, MontantOp: montant, IDcat: idcat, Confiance: confiance })
  }
  return result
}

// Correspondances apprises appliquées de façon déterministe : même clé source → libellé et catégorie retenus la dernière fois.
// `correspondances` est trié de la plus récente à la plus ancienne.
export const applyCorrespondances = (lignes: LigneNormalisee[], correspondances: Correspondance[], categoriesLisibles: Set<number>): LigneNormalisee[] => {
  const parCle = new Map<string, Correspondance>()
  for (const c of correspondances) if (c.CleSource && !parCle.has(c.CleSource)) parCle.set(c.CleSource, c)
  return lignes.map((ligne) => {
    const appris = ligne.CleSource ? parCle.get(ligne.CleSource) : undefined
    if (!appris) return ligne
    const idcat = appris.IDcat === 0 || categoriesLisibles.has(appris.IDcat) ? appris.IDcat : ligne.IDcat
    return { ...ligne, NomOp: appris.NomOp, IDcat: idcat, Confiance: idcat === appris.IDcat ? 'haute' : ligne.Confiance }
  })
}
