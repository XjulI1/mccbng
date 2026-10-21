import { describe, expect, it } from 'vitest'
import { amortize } from '../../server/utils/amortization'

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const payment = (iso: string, MontantOp: number) => ({ MontantOp, DateOp: d(iso) })

describe('amortize', () => {
  it('sans paiement : tout le capital reste dû', () => {
    expect(amortize({ MontantInitial: 1000, TauxInteret: 5 }, [])).toEqual({ solde: 1000, paye: 0, interets: 0 })
  })

  it('sans intérêts : chaque paiement réduit le capital', () => {
    const payments = ['2024-01-15', '2024-02-15', '2024-03-15'].map(iso => payment(iso, -100))
    expect(amortize({ MontantInitial: 1000, TauxInteret: null }, payments)).toEqual({ solde: 700, paye: 300, interets: 0 })
  })

  it('avec intérêts : la première échéance couvre un mois d\'intérêts, puis le capital', () => {
    const result = amortize({ MontantInitial: 1200, TauxInteret: 12 }, [payment('2024-03-05', -112)])
    expect(result.interets).toBeCloseTo(12, 10)
    expect(result.paye).toBeCloseTo(100, 10)
    expect(result.solde).toBeCloseTo(1100, 10)
  })

  it('suspension d\'échéances : la reprise porte les intérêts des mois écoulés', () => {
    const result = amortize({ MontantInitial: 1000, TauxInteret: 12 }, [payment('2024-01-10', -110), payment('2024-05-10', -136)])
    expect(result.interets).toBeCloseTo(10 + 36, 10)
    expect(result.solde).toBeCloseTo(800, 10)
  })

  it('deux paiements dans le même mois : un seul mois d\'intérêts', () => {
    const result = amortize({ MontantInitial: 1000, TauxInteret: 12 }, [payment('2024-01-05', -110), payment('2024-01-20', -50)])
    expect(result.interets).toBeCloseTo(10, 10)
    expect(result.solde).toBeCloseTo(850, 10)
  })
})
