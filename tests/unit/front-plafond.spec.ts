import { describe, expect, it } from 'vitest'
import { plafondJauge } from '../../app/utils/plafond'

describe('plafondJauge', () => {
  it('sans plafond positif : pas de jauge', () => {
    expect(plafondJauge(1000, null)).toBeNull()
    expect(plafondJauge(1000, undefined)).toBeNull()
    expect(plafondJauge(1000, 0)).toBeNull()
    expect(plafondJauge(1000, -5)).toBeNull()
  })

  it('part utilisée, remplissage et marge restante', () => {
    expect(plafondJauge(11475, 22950)).toEqual({ percent: 50, largeur: 50, reste: 11475 })
    expect(plafondJauge(22950, 22950)).toEqual({ percent: 100, largeur: 100, reste: 0 })
    expect(plafondJauge(undefined, 22950)).toEqual({ percent: 0, largeur: 0, reste: 22950 })
  })

  it('plafond dépassé : pourcentage au-delà de 100, jauge pleine', () => {
    const jauge = plafondJauge(25245, 22950)
    expect(jauge?.percent).toBeCloseTo(110)
    expect(jauge).toMatchObject({ largeur: 100, reste: -2295 })
  })

  it('solde négatif : jauge vide', () => {
    expect(plafondJauge(-20, 22950)).toMatchObject({ largeur: 0, reste: 22970 })
  })
})
