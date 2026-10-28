import { describe, expect, it } from 'vitest'
import { importErrorMessage, type LotImport } from '../../app/services/imports'
import { fitWithin } from '../../app/utils/imageNormalize'
import {
  canRestoreSource, emptyRow, isRowValid, needsAttention, rowsFromLot, selectionSummary, toLignesValidees
} from '../../app/utils/importReview'
import { frameTimes, meanDifference } from '../../app/utils/videoFrames'

const lot: LotImport = {
  IDimport: 7, IDcompte: 3, Statut: 'brouillon', Source: 'image', DateCreation: '2026-10-28T10:00:00.000Z',
  lignes: [
    {
      IDligne: 1, Ordre: 0, DateOp: '2026-10-12T00:00:00.000Z', LibelleSource: 'CB CARREFOUR 12/10', NomOp: 'Courses Carrefour', MontantOp: -45.3,
      IDcat: 5, Confiance: 'haute', IDopDoublon: null, DoublonLot: false, Selection: true, doublon: null
    },
    {
      IDligne: 2, Ordre: 1, DateOp: '2026-10-11T00:00:00.000Z', LibelleSource: 'BOULANGERIE', NomOp: 'BOULANGERIE', MontantOp: -4.2,
      IDcat: 0, Confiance: 'moyenne', IDopDoublon: 9, DoublonLot: false, Selection: false,
      doublon: { IDop: 9, NomOp: 'Boulangerie', DateOp: '2026-10-10T00:00:00.000Z', MontantOp: -4.2 }
    }
  ]
}

describe('revue d\'import', () => {
  it('les doublons arrivent décochés et signalés', () => {
    const rows = rowsFromLot(lot)
    expect(rows.map(r => [r.checked, r.DateOp, needsAttention(r)])).toEqual([[true, '2026-10-12', false], [false, '2026-10-11', true]])
  })

  it('total et nombre recalculés sur les lignes cochées', () => {
    const rows = rowsFromLot(lot)
    expect(selectionSummary(rows)).toEqual({ count: 1, total: -45.3, invalid: 0 })
    rows[1]!.checked = true
    rows[1]!.MontantOp = '-4,25'
    expect(selectionSummary(rows)).toEqual({ count: 2, total: -49.55, invalid: 0 })
  })

  it('seules les lignes cochées sont envoyées, avec les corrections et les ajouts manuels', () => {
    const rows = rowsFromLot(lot)
    rows[0]!.NomOp = '  Courses  '
    rows.push({ ...emptyRow('2026-10-15'), NomOp: 'Ajout', MontantOp: '-3.5' })
    expect(toLignesValidees(rows)).toEqual([
      { IDligne: 1, DateOp: '2026-10-12', NomOp: 'Courses', MontantOp: -45.3, IDcat: 5 },
      { DateOp: '2026-10-15', NomOp: 'Ajout', MontantOp: -3.5, IDcat: 0 }
    ])
  })

  it('reprise du libellé brut proposée seulement s\'il diffère', () => {
    const [carrefour, boulangerie] = rowsFromLot(lot)
    expect(canRestoreSource(carrefour!)).toBe(true)
    expect(canRestoreSource(boulangerie!)).toBe(false)
    expect(canRestoreSource(emptyRow())).toBe(false)
  })

  it('ligne invalide : libellé vide ou montant illisible', () => {
    expect(isRowValid({ ...emptyRow(), NomOp: 'x', MontantOp: 'abc' })).toBe(false)
    expect(isRowValid({ ...emptyRow(), NomOp: ' ' })).toBe(false)
    expect(isRowValid({ ...emptyRow(), NomOp: 'x', MontantOp: '-2' })).toBe(true)
  })
})

describe('découpage vidéo et images', () => {
  it('une image par seconde, puis espacées au-delà de 20', () => {
    expect(frameTimes(15)).toHaveLength(15)
    expect(frameTimes(15)[0]).toBe(0.5)
    const longue = frameTimes(100)
    expect(longue).toHaveLength(20)
    expect(longue[1]! - longue[0]!).toBe(5)
    expect(frameTimes(0)).toEqual([0])
  })

  it('écart moyen des empreintes', () => {
    expect(meanDifference([0, 10], [0, 10])).toBe(0)
    expect(meanDifference([0, 10], [10, 30])).toBe(15)
  })

  it('réduction sans agrandissement', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })
})

describe('messages d\'erreur', () => {
  it('statuts traduits pour l\'utilisateur', () => {
    expect(importErrorMessage({ status: 429 })).toContain('dernière heure')
    expect(importErrorMessage({ status: 422, apiMessage: 'Aucune opération n\'a été trouvée dans le contenu envoyé' })).toBe('Aucune opération n\'a été trouvée dans le contenu envoyé')
    expect(importErrorMessage({ status: 502, apiMessage: 'Service saturé' })).toBe('Service saturé')
  })
})
