import { describe, expect, it } from 'vitest'
import { escapeLike } from '../../app/utils/like'
import { searchOperationsWhere } from '../../app/services/operation'
import { dateOpWithin, dayRange, monthRange } from '../../app/utils/dates'

describe('escapeLike', () => {
  it('échappe %, _ et \\', () => {
    expect(escapeLike('100%')).toBe('100\\%')
    expect(escapeLike('a_b')).toBe('a\\_b')
    expect(escapeLike('c:\\temp')).toBe('c:\\\\temp')
    expect(escapeLike('loyer')).toBe('loyer')
  })
})

describe('searchOperationsWhere', () => {
  const nomOp = (where: any) => where.or[0].NomOp.like
  const montants = (where: any) => where.or.slice(1)

  it('libellé seul pour un terme non numérique, jokers saisis échappés', () => {
    const where = searchOperationsWhere('100%', [1, 2])
    expect(where.IDcompte).toEqual({ inq: [1, 2] })
    expect(nomOp(where)).toBe('%100\\%%')
    expect(montants(where)).toEqual([])
  })

  it('entier : plage d\'un euro en valeur absolue', () => {
    const where = searchOperationsWhere('12', [1])
    expect(nomOp(where)).toBe('%12%')
    expect(montants(where)).toEqual([
      { MontantOp: { gte: 12, lt: 13 } },
      { MontantOp: { gt: -13, lte: -12 } }
    ])
    expect(montants(searchOperationsWhere(' -12 ', [1]))).toEqual(montants(where))
  })

  it('décimal (virgule ou point) : égalité exacte en valeur absolue', () => {
    expect(montants(searchOperationsWhere('12,5', [1]))).toEqual([{ MontantOp: { inq: [12.5, -12.5] } }])
    expect(montants(searchOperationsWhere('-12.55', [1]))).toEqual([{ MontantOp: { inq: [12.55, -12.55] } }])
  })

  it('pas de comparaison de montant pour un terme presque numérique', () => {
    for (const term of ['12,555', '1 200', '12e3', '12,', ',5']) expect(montants(searchOperationsWhere(term, [1]))).toEqual([])
  })
})

describe('bornes de dates (ISO UTC, intervalle semi-ouvert)', () => {
  it('monthRange : décembre → janvier, février bissextile', () => {
    expect(monthRange(2024, 12)).toEqual({ from: new Date('2024-12-01T00:00:00.000Z'), to: new Date('2025-01-01T00:00:00.000Z') })
    expect(monthRange(2024, 2).to.toISOString()).toBe('2024-03-01T00:00:00.000Z')
    expect(monthRange(2023, 2).from.toISOString()).toBe('2023-02-01T00:00:00.000Z')
  })

  it('dayRange : `to` inclus, passage d\'année et 29 février', () => {
    expect(dayRange('2024-01-01', '2024-12-31').to.toISOString()).toBe('2025-01-01T00:00:00.000Z')
    expect(dayRange('2024-02-01', '2024-02-29').to.toISOString()).toBe('2024-03-01T00:00:00.000Z')
  })

  it('dateOpWithin : gte début, lt début de la période suivante', () => {
    const range = monthRange(2024, 3)
    expect(dateOpWithin(range)).toEqual([{ DateOp: { gte: range.from } }, { DateOp: { lt: range.to } }])
  })
})
