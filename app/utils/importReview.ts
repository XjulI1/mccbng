import type { Confiance, LigneImport, LigneValidee, LotImport } from '@/services/imports'

// Ligne éditable de l'écran de revue d'un import
export interface ReviewRow {
  key: string
  IDligne?: number
  checked: boolean
  // AAAA-MM-JJ (input date)
  DateOp: string
  NomOp: string
  MontantOp: number | string
  IDcat: number
  LibelleSource?: string
  Confiance?: Confiance
  doublon: LigneImport['doublon']
  DoublonLot: boolean
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const isoDay = (value: string | Date) => new Date(value).toISOString().slice(0, 10)

export const rowsFromLot = (lot: LotImport): ReviewRow[] =>
  lot.lignes.map(ligne => ({
    key: `l${ligne.IDligne}`,
    IDligne: ligne.IDligne,
    checked: ligne.Selection,
    DateOp: isoDay(ligne.DateOp),
    NomOp: ligne.NomOp,
    MontantOp: ligne.MontantOp,
    IDcat: ligne.IDcat,
    LibelleSource: ligne.LibelleSource,
    Confiance: ligne.Confiance,
    doublon: ligne.doublon,
    DoublonLot: ligne.DoublonLot
  }))

let manualKey = 0
export const emptyRow = (DateOp = isoDay(new Date())): ReviewRow => ({
  key: `m${++manualKey}`, checked: true, DateOp, NomOp: '', MontantOp: 0, IDcat: 0, doublon: null, DoublonLot: false
})

const montant = (row: ReviewRow) => Number(String(row.MontantOp).replace(',', '.'))

export const isRowValid = (row: ReviewRow) =>
  row.NomOp.trim().length > 0 && Number.isFinite(montant(row)) && /^\d{4}-\d{2}-\d{2}$/.test(row.DateOp)

// Le libellé du relevé diffère du libellé proposé : il peut être repris
export const canRestoreSource = (row: ReviewRow) => Boolean(row.LibelleSource) && row.LibelleSource !== row.NomOp

export const needsAttention = (row: ReviewRow) => Boolean(row.doublon) || row.DoublonLot || row.Confiance === 'faible'

export const selectionSummary = (rows: ReviewRow[]) => {
  const selected = rows.filter(row => row.checked)
  return {
    count: selected.length,
    total: round2(selected.reduce((sum, row) => sum + (Number.isFinite(montant(row)) ? montant(row) : 0), 0)),
    invalid: selected.filter(row => !isRowValid(row)).length
  }
}

// Lignes cochées envoyées à la validation (les lignes ajoutées à la main n'ont pas d'IDligne)
export const toLignesValidees = (rows: ReviewRow[]): LigneValidee[] =>
  rows.filter(row => row.checked).map(row => ({
    ...(row.IDligne === undefined ? {} : { IDligne: row.IDligne }),
    DateOp: row.DateOp,
    NomOp: row.NomOp.trim(),
    MontantOp: round2(montant(row)),
    IDcat: Number(row.IDcat) || 0
  }))
