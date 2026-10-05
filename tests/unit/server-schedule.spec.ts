import { describe, expect, it } from 'vitest'
import { round2 } from '../../server/utils/money'
import {
  firstDueOnOrAfter, initialLastDate, nextDueDate, prevDueDate, type RecurrenceRule
} from '../../server/utils/schedule'

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const iso = (date: Date) => date.toISOString().slice(0, 10)
const monthly = (JourNumOpRecu: number): RecurrenceRule => ({ Frequence: 3, JourNumOpRecu, MoisOpRecu: 0 })
const yearly = (MoisOpRecu: number, JourNumOpRecu: number): RecurrenceRule => ({ Frequence: 7, JourNumOpRecu, MoisOpRecu })

const chain = (rule: RecurrenceRule, start: Date, count: number) => {
  const dates: string[] = []
  let last = start
  for (let i = 0; i < count; i++) {
    last = nextDueDate(rule, last)
    dates.push(iso(last))
  }
  return dates
}

describe('nextDueDate', () => {
  it('mensuel au 31 : borné au dernier jour du mois, sans dérive', () => {
    expect(chain(monthly(31), d('2026-01-31'), 3)).toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
    expect(chain(monthly(31), d('2024-01-31'), 2)).toEqual(['2024-02-29', '2024-03-31'])
  })

  it('annuel au 29 février', () => {
    expect(chain(yearly(1, 29), d('2024-02-29'), 4)).toEqual(['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29'])
  })

  it('mois suivant : une récurrente décalée au 3 avec un jour choisi au 25 ne génère pas deux fois le même mois', () => {
    expect(iso(nextDueDate(monthly(25), d('2026-10-03')))).toBe('2026-11-25')
  })

  it('décembre → janvier', () => {
    expect(iso(nextDueDate(monthly(15), d('2026-12-15')))).toBe('2027-01-15')
  })

  it('annuel en janvier et en décembre', () => {
    expect(iso(nextDueDate(yearly(0, 10), d('2026-01-10')))).toBe('2027-01-10')
    expect(iso(nextDueDate(yearly(11, 24), d('2026-12-24')))).toBe('2027-12-24')
    // dernière date hors du mois choisi : l'échéance reste au mois MoisOpRecu de l'année suivante
    expect(iso(nextDueDate(yearly(0, 10), d('2026-06-01')))).toBe('2027-01-10')
  })

  it('ignore l\'heure de la dernière date', () => {
    expect(iso(nextDueDate(monthly(5), new Date('2026-10-05T14:37:00.000Z')))).toBe('2026-11-05')
  })

  it('refuse une fréquence inconnue', () => {
    expect(() => nextDueDate({ Frequence: 5, JourNumOpRecu: 1, MoisOpRecu: 0 }, d('2026-01-01'))).toThrow()
  })
})

describe('prevDueDate', () => {
  it('inverse de nextDueDate', () => {
    for (const [rule, due] of [
      [monthly(31), '2026-03-31'], [monthly(31), '2026-02-28'], [monthly(1), '2026-01-01'],
      [yearly(1, 29), '2028-02-29'], [yearly(11, 31), '2026-12-31']
    ] as const) {
      expect(iso(nextDueDate(rule, prevDueDate(rule, d(due))))).toBe(due)
    }
    expect(iso(prevDueDate(monthly(31), d('2026-03-31')))).toBe('2026-02-28')
  })
})

describe('firstDueOnOrAfter / initialLastDate', () => {
  it('échéance du jour incluse', () => {
    expect(iso(firstDueOnOrAfter(monthly(5), new Date('2026-10-05T18:00:00Z')))).toBe('2026-10-05')
    expect(iso(firstDueOnOrAfter(yearly(1, 29), d('2026-03-01')))).toBe('2027-02-28')
  })

  it('récurrente au 25 créée le 5 : la première échéance est le 25 du mois courant', () => {
    const last = initialLastDate(monthly(25), d('2026-10-05'), d('2026-10-05'))
    expect(iso(last)).toBe('2026-09-25')
    expect(iso(nextDueDate(monthly(25), last))).toBe('2026-10-25')
  })

  it('récurrente au 3 créée le 5 : la première échéance est le 3 du mois suivant', () => {
    const last = initialLastDate(monthly(3), d('2026-10-05'), d('2026-10-05'))
    expect(iso(last)).toBe('2026-10-03')
    expect(iso(nextDueDate(monthly(3), last))).toBe('2026-11-03')
  })

  it('crédit futur : la première mensualité est celle de DateDebut', () => {
    const last = initialLastDate(monthly(15), d('2027-03-15'), d('2026-10-05'))
    expect(iso(last)).toBe('2027-02-15')
    expect(iso(nextDueDate(monthly(15), last))).toBe('2027-03-15')
  })

  it('crédit démarré dans le passé : aucun rattrapage', () => {
    expect(iso(initialLastDate(monthly(10), d('2022-01-10'), d('2026-10-05')))).toBe('2026-09-10')
    expect(iso(initialLastDate(monthly(10), d('2022-01-10'), d('2026-10-12')))).toBe('2026-10-10')
  })
})

describe('round2', () => {
  it('arrondit correctement les demi-centimes', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(-12.344)).toBe(-12.34)
    expect(round2(0.1 + 0.2)).toBe(0.3)
  })
})
