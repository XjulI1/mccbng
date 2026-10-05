import { describe, expect, it } from 'vitest'
import { monthRange, yearRange } from '../../server/utils/stats'

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
