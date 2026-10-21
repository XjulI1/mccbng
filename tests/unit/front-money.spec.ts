import { describe, expect, it } from 'vitest'
import { formatEuros } from '../../app/utils/money'

const spaces = (text: string) => text.replace(/\s/g, ' ').replace(/−/g, '-')

describe('formatEuros', () => {
  it('montant en euros au format français, deux décimales', () => {
    expect(spaces(formatEuros(1234.5))).toBe('1 234,50 €')
    expect(spaces(formatEuros(-830))).toBe('-830,00 €')
  })

  it('montant absent affiché à zéro', () => {
    expect(spaces(formatEuros(null))).toBe('0,00 €')
    expect(spaces(formatEuros(undefined))).toBe('0,00 €')
  })
})
