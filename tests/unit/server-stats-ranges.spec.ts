import { describe, expect, it } from 'vitest'
import { monthRange, savingsPeriods, savingsRate, yearRange } from '../../server/utils/stats'

describe('monthRange / yearRange (bornes UTC semi-ouvertes)', () => {
  it('mois : décembre → janvier, février bissextile ou non', () => {
    expect(monthRange(2024, 12)).toEqual({ from: '2024-12-01', toExclusive: '2025-01-01' })
    expect(monthRange(2024, 2)).toEqual({ from: '2024-02-01', toExclusive: '2024-03-01' })
    expect(monthRange(2023, 2)).toEqual({ from: '2023-02-01', toExclusive: '2023-03-01' })
    expect(monthRange(2024, 1)).toEqual({ from: '2024-01-01', toExclusive: '2024-02-01' })
  })

  it('année civile', () => {
    expect(yearRange(2024)).toEqual({ from: '2024-01-01', toExclusive: '2025-01-01' })
  })

  it('mois ou année invalide : 400', () => {
    for (const [y, m] of [[2024, 0], [2024, 13], [2024, 1.5], [24, 1], [2024.5, 1]] as const) {
      expect(() => monthRange(y, m)).toThrowError(/must be an integer/)
    }
    expect(() => yearRange(10000)).toThrowError(/must be an integer/)
  })
})

describe('savingsPeriods / savingsRate (récap de la home)', () => {
  it('derniers mois complets, mois en cours exclu, changement d\'année', () => {
    expect(savingsPeriods(new Date('2026-10-28T12:00:00.000Z'))).toEqual([
      { mois: 6, from: '2026-04-01', toExclusive: '2026-10-01' },
      { mois: 12, from: '2025-10-01', toExclusive: '2026-10-01' },
      { mois: 24, from: '2024-10-01', toExclusive: '2026-10-01' },
      { mois: 60, from: '2021-10-01', toExclusive: '2026-10-01' }
    ])
    expect(savingsPeriods(new Date('2026-01-01T00:00:00.000Z'))[0]).toEqual({ mois: 6, from: '2025-07-01', toExclusive: '2026-01-01' })
  })

  it('taux : (revenus + dépenses nettes) / revenus, null sans revenu', () => {
    expect(savingsRate(4000, -3000)).toBe(25)
    expect(savingsRate(3000, -3500)).toBe(-16.7)
    expect(savingsRate(0, -100)).toBeNull()
  })
})
