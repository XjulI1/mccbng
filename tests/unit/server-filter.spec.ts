import { describe, expect, it } from 'vitest'
import { MySqlDialect } from 'drizzle-orm/mysql-core'
import { sql, type SQL } from 'drizzle-orm'
import { comptes, operations } from '../../server/db/schema'
import { parseFilter, parseWhere } from '../../server/utils/filter'

const dialect = new MySqlDialect()
const render = (query: SQL) => dialect.sqlToQuery(query)

describe('parseFilter (filtre de style LoopBack)', () => {
  it('sans filtre : rien à appliquer', () => {
    expect(parseFilter(undefined, comptes)).toEqual({ orderBy: [], include: [] })
  })

  it('where, order, limit, skip', () => {
    const f = parseFilter(JSON.stringify({ where: { IDcompte: 3 }, order: 'CheckOp ASC, DateOp DESC', limit: 35, skip: 70 }), operations)
    const where = render(f.where!)
    expect(where.sql).toContain('`IDcompte` = ?')
    expect(where.params).toEqual([3])
    expect(f.orderBy).toHaveLength(2)
    expect(f.limit).toBe(35)
    expect(f.offset).toBe(70)
  })

  it('and / or / inq / like', () => {
    const f = parseFilter({
      where: { IDcompte: { inq: [1, 2] }, or: [{ NomOp: { like: '%x%' } }, { MontantOp: { like: '%x%' } }] }
    }, operations)
    const q = render(f.where!)
    expect(q.sql).toMatch(/IDcompte.* in \(\?, \?\)/i)
    expect(q.sql).toMatch(/NomOp.* like \?/i)
    expect(q.params).toEqual([1, 2, '%x%', '%x%'])
  })

  it('inq vide : aucune ligne', () => {
    expect(render(parseFilter({ where: { IDcompte: { inq: [] } } }, operations).where!).sql).toContain('1 = 0')
  })

  it('les dates JSON sont converties pour les colonnes datetime', () => {
    const q = render(parseFilter({ where: { DateOp: { gte: '2024-01-01' } } }, operations).where!)
    expect(q.params[0]).toBe('2024-01-01 00:00:00.000') // converti en Date puis sérialisé par Drizzle
  })

  it('liste blanche : colonne, opérateur, tri et relation inconnus → 400', () => {
    const bad = (filter: unknown) => expect(() => parseFilter(filter, comptes, { relations: ['banque'] })).toThrowError(/Invalid filter|Invalid JSON|too large/)
    bad({ where: { password: 1 } })
    bad({ where: { NomCompte: { regexp: 'x' } } })
    bad({ order: 'NomCompte; DROP TABLE Compte' })
    bad({ order: 'NomCompte SIDEWAYS' })
    bad({ include: [{ relation: 'secrets' }] })
    bad({ limit: -1 })
    bad('{pas du json')
    bad({ where: { constructor: 1 } })
    bad({ where: { or: 'oops' } })
  })

  it('include autorisé et limit plafonnée', () => {
    const f = parseFilter({ include: [{ relation: 'banque' }], limit: 99999 }, comptes, { relations: ['banque'], maxLimit: 100 })
    expect(f.include).toEqual(['banque'])
    expect(f.limit).toBe(100)
  })

  it('imbrication excessive refusée', () => {
    let where: any = { IDcompte: 1 }
    for (let i = 0; i < 10; i++) where = { and: [where] }
    expect(() => parseFilter({ where }, operations)).toThrowError(/nested too deeply/)
  })

  it('parseWhere (count, PATCH en masse)', () => {
    expect(parseWhere(undefined, comptes)).toBeUndefined()
    expect(render(parseWhere('{"NomCompte":"x"}', comptes)!).params).toEqual(['x'])
    void sql
  })
})
