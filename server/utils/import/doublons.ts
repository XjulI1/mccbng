import { startOfUtcDay } from '../schedule'

const DAY_MS = 24 * 60 * 60 * 1000
export const DOUBLON_JOURS = 3

export interface OperationExistante { IDop: number; DateOp: Date; MontantOp: number }
export interface LigneComparable { DateOp: Date; MontantOp: number }
export interface Doublon { IDopDoublon: number | null; DoublonLot: boolean; Selection: boolean }

const cents = (montant: number) => Math.round(montant * 100)
const ecartJours = (a: Date, b: Date) => Math.abs(startOfUtcDay(a).getTime() - startOfUtcDay(b).getTime()) / DAY_MS

// Doublon probable : opération existante de même montant exact à ±3 jours (la plus proche, appariée au plus une fois),
// ou ligne du lot de même date et même montant qu'une ligne précédente. Le libellé est ignoré : les banques le réécrivent.
export const detectDoublons = (lignes: LigneComparable[], existantes: OperationExistante[]): Doublon[] => {
  const disponibles = new Set(existantes)
  const vus = new Set<string>()
  return lignes.map((ligne) => {
    let meilleure: OperationExistante | undefined
    let meilleurEcart = Infinity
    for (const op of disponibles) {
      if (cents(op.MontantOp) !== cents(ligne.MontantOp)) continue
      const ecart = ecartJours(op.DateOp, ligne.DateOp)
      if (ecart <= DOUBLON_JOURS && (ecart < meilleurEcart || (ecart === meilleurEcart && op.IDop < meilleure!.IDop))) {
        meilleure = op
        meilleurEcart = ecart
      }
    }
    if (meilleure) disponibles.delete(meilleure)

    const cle = `${startOfUtcDay(ligne.DateOp).getTime()}|${cents(ligne.MontantOp)}`
    const doublonLot = vus.has(cle)
    vus.add(cle)

    return { IDopDoublon: meilleure?.IDop ?? null, DoublonLot: doublonLot, Selection: !meilleure && !doublonLot }
  })
}

// Fenêtre de recherche des opérations existantes couvrant toutes les lignes du lot
export const fenetreDoublons = (lignes: LigneComparable[]) => {
  const times = lignes.map(l => startOfUtcDay(l.DateOp).getTime())
  return {
    debut: new Date(Math.min(...times) - DOUBLON_JOURS * DAY_MS),
    fin: new Date(Math.max(...times) + (DOUBLON_JOURS + 1) * DAY_MS - 1),
    montants: [...new Set(lignes.map(l => l.MontantOp))]
  }
}
