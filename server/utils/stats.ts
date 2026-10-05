import { z } from 'zod'
import { badRequest } from './errors'
import { rawQuery } from './sql'

export const MAX_LIMIT = 50
const DEFAULT_LIMIT = 10

export const clampLimit = (value?: number): number => {
  if (!value || Number.isNaN(value)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.floor(value), 1), MAX_LIMIT)
}

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
})

// Plage de dates YYYY-MM-DD ; la borne `to` inclut toute la journée (filtre DateOp >= from AND DateOp < toExclusive).
export const parseRange = (from?: string, to?: string): { from: string; toExclusive: string } => {
  if (!from || !to) throw badRequest('from and to are required')
  if (!isoDay.safeParse(from).success || !isoDay.safeParse(to).success) throw badRequest('from and to must be valid YYYY-MM-DD dates')
  if (from > to) throw badRequest('from must be earlier than to')
  const end = new Date(`${to}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() + 1)
  return { from, toExclusive: end.toISOString().slice(0, 10) }
}

// Règle commune à tous les totaux de dépense : une opération compte selon le Type de sa catégorie (partagée ou
// de l'utilisateur), entrées comme sorties. Il n'y a pas d'opération sans catégorie : IDcat = 0 est la catégorie
// partagée « Aucune » (Type 'depense'), comptée comme les autres. Les transferts sont exclus.
// À utiliser avec l'alias `o` pour Operation ; EXPENSE_JOIN attend l'IDuser en paramètre.
export const EXPENSE_JOIN = 'INNER JOIN Categorie c ON c.IDcat = o.IDcat AND c.IDuser IN (0, ?) '
export const EXPENSE_WHERE = "c.Type = 'depense'"
export const EXPENSE_CAT = 'o.IDcat'

// Drapeaux de compte NULL (anciens comptes) : valeur par défaut, jamais d'exclusion du compte.
export const flag = (name: 'bloque' | 'retraite' | 'children' | 'porte_feuille') => `COALESCE(${name}, 0)`
const GLOBAL = `${flag('retraite')} = 0 AND ${flag('children')} = 0`
const RETRAITE = `${flag('retraite')} = 1`
// Dispo : sous-ensemble de global, hors comptes bloqués
const DISPO = `${GLOBAL} AND ${flag('bloque')} = 0`

const placeholders = (ids: number[]) => ids.map(() => '?').join(',')
const n = (value: unknown) => Number(value) || 0

export const evolutionSolde = async (userID: number) => {
  const dates = "DATE_FORMAT(DateOp, '%Y-%m-%dT00:00:00.000Z') AS date "
  const [soldeGlobal, soldeRetraite, soldeDispo, global, retraite, dispo] = await Promise.all([
    rawQuery(`SELECT ROUND(SUM(solde), 2) AS sum FROM Compte WHERE IDuser = ? AND ${GLOBAL}`, [userID]),
    rawQuery(`SELECT ROUND(SUM(solde), 2) AS sum FROM Compte WHERE IDuser = ? AND ${RETRAITE}`, [userID]),
    rawQuery(`SELECT ROUND(SUM(solde), 2) AS sum FROM Compte WHERE IDuser = ? AND ${DISPO}`, [userID]),
    rawQuery(
      `SELECT ROUND(SUM(MontantOp),2) AS montant, ${dates}` +
      `FROM Operation NATURAL JOIN Compte WHERE IDuser = ? AND ${GLOBAL} GROUP BY date ORDER BY date ASC`,
      [userID]
    ),
    rawQuery(
      `SELECT ROUND(SUM(MontantOp),2) AS montant, ${dates}` +
      `FROM Operation NATURAL JOIN Compte WHERE IDuser = ? AND ${RETRAITE} GROUP BY date ORDER BY date ASC`,
      [userID]
    ),
    rawQuery(
      `SELECT ROUND(SUM(MontantOp),2) AS montant, ${dates}` +
      `FROM Operation NATURAL JOIN Compte WHERE IDuser = ? AND ${DISPO} GROUP BY date ORDER BY date ASC`,
      [userID]
    )
  ])
  return {
    soldeGlobal: soldeGlobal[0]?.sum,
    soldeRetraite: soldeRetraite[0]?.sum,
    soldeDispo: soldeDispo[0]?.sum,
    global,
    retraite,
    dispo
  }
}

// Dépense nette par mois sur deux années (catégories Type='depense' ; un remboursement rangé dans une catégorie
// de dépense vient en déduction). Tableaux de 12 mois + écart en % de yearB vs yearA.
export const yearComparison = async (userID: number, compteIds: number[], yearA: number, yearB: number) => {
  if (!compteIds.length) {
    return { yearA: new Array(12).fill(0), yearB: new Array(12).fill(0), deltaPct: new Array(12).fill(null) }
  }
  const rows = await rawQuery<{ y: number | string; m: number | string; total: number | string }>(
    'SELECT YEAR(o.DateOp) AS y, MONTH(o.DateOp) AS m, ROUND(SUM(o.MontantOp), 2) AS total ' +
    'FROM Operation o ' +
    EXPENSE_JOIN +
    `WHERE o.IDcompte IN (${placeholders(compteIds)}) ` +
    'AND YEAR(o.DateOp) IN (?, ?) ' +
    `AND ${EXPENSE_WHERE} ` +
    'GROUP BY YEAR(o.DateOp), MONTH(o.DateOp)',
    [userID, ...compteIds, yearA, yearB]
  )
  const seriesA: number[] = new Array(12).fill(0)
  const seriesB: number[] = new Array(12).fill(0)
  for (const row of rows) {
    const idx = Number(row.m) - 1
    if (Number(row.y) === yearA) seriesA[idx] = n(row.total)
    if (Number(row.y) === yearB) seriesB[idx] = n(row.total)
  }
  const deltaPct = seriesA.map((a, i) => (a ? Math.round(((seriesB[i]! - a) / Math.abs(a)) * 10000) / 100 : null))
  return { yearA: seriesA, yearB: seriesB, deltaPct }
}

// Plus grosses catégories de dépense sur une période (dépenses négatives : tri ASC) ; `toExclusive` = lendemain de `to`.
export const topCategories = async (userID: number, compteIds: number[], from: string, toExclusive: string, limit: number) => {
  if (!compteIds.length) return []
  return rawQuery(
    `SELECT ${EXPENSE_CAT} AS IDcat, c.Nom AS libelle, ROUND(SUM(o.MontantOp), 2) AS total ` +
    'FROM Operation o ' +
    EXPENSE_JOIN +
    `WHERE o.IDcompte IN (${placeholders(compteIds)}) ` +
    'AND o.DateOp >= ? AND o.DateOp < ? ' +
    `AND ${EXPENSE_WHERE} ` +
    `GROUP BY ${EXPENSE_CAT}, c.Nom ` +
    'ORDER BY total ASC ' +
    'LIMIT ?',
    [userID, ...compteIds, from, toExclusive, limit]
  )
}

// Regroupe par Type de catégorie (et non par signe) : un remboursement rangé en dépense n'est pas un revenu.
export const incomeVsExpense = async (userID: number, compteIds: number[], yearNumber: number) => {
  if (!compteIds.length) return { income: new Array(12).fill(0), expense: new Array(12).fill(0) }
  const rows = await rawQuery<{ m: number | string; income: number | string; expense: number | string }>(
    'SELECT MONTH(o.DateOp) AS m, ' +
    "ROUND(SUM(CASE WHEN c.Type = 'revenu' THEN o.MontantOp ELSE 0 END), 2) AS income, " +
    `ROUND(SUM(CASE WHEN ${EXPENSE_WHERE} THEN o.MontantOp ELSE 0 END), 2) AS expense ` +
    'FROM Operation o ' +
    EXPENSE_JOIN +
    `WHERE o.IDcompte IN (${placeholders(compteIds)}) ` +
    'AND YEAR(o.DateOp) = ? ' +
    `AND (c.Type = 'revenu' OR ${EXPENSE_WHERE}) ` +
    'GROUP BY MONTH(o.DateOp)',
    [userID, ...compteIds, yearNumber]
  )
  const income: number[] = new Array(12).fill(0)
  const expense: number[] = new Array(12).fill(0)
  for (const row of rows) {
    const idx = Number(row.m) - 1
    income[idx] = n(row.income)
    expense[idx] = n(row.expense)
  }
  return { income, expense }
}

// Plus grosses opérations (valeur absolue) : revenus et dépenses ; les transferts sont exclus.
export const topOperations = async (userID: number, compteIds: number[], from: string, toExclusive: string, limit: number) => {
  if (!compteIds.length) return []
  return rawQuery(
    `SELECT o.IDop, o.NomOp, o.MontantOp, o.DateOp, ${EXPENSE_CAT} AS IDcat, o.IDcompte ` +
    'FROM Operation o ' +
    EXPENSE_JOIN +
    `WHERE o.IDcompte IN (${placeholders(compteIds)}) ` +
    'AND o.DateOp >= ? AND o.DateOp < ? ' +
    `AND (c.Type = 'revenu' OR ${EXPENSE_WHERE}) ` +
    'ORDER BY ABS(o.MontantOp) DESC ' +
    'LIMIT ?',
    [userID, ...compteIds, from, toExclusive, limit]
  )
}

// Matrice mois (0-11) × catégorie, au format d'entrée d'une heatmap Highcharts.
export const categoryHeatmap = async (userID: number, compteIds: number[], yearNumber: number) => {
  if (!compteIds.length) return { categories: [], data: [] }
  const rows = await rawQuery<{ m: number | string; IDcat: number | string; libelle: string; total: number | string }>(
    `SELECT MONTH(o.DateOp) AS m, ${EXPENSE_CAT} AS IDcat, c.Nom AS libelle, ROUND(SUM(o.MontantOp), 2) AS total ` +
    'FROM Operation o ' +
    EXPENSE_JOIN +
    `WHERE o.IDcompte IN (${placeholders(compteIds)}) ` +
    'AND YEAR(o.DateOp) = ? ' +
    `AND ${EXPENSE_WHERE} ` +
    `GROUP BY MONTH(o.DateOp), ${EXPENSE_CAT}, c.Nom`,
    [userID, ...compteIds, yearNumber]
  )
  const totalsByCat = new Map<number, { libelle: string; total: number }>()
  for (const row of rows) {
    const id = Number(row.IDcat)
    const existing = totalsByCat.get(id)
    if (existing) existing.total += n(row.total)
    else totalsByCat.set(id, { libelle: row.libelle, total: n(row.total) })
  }
  const categories = [...totalsByCat.entries()]
    .sort((a, b) => a[1].total - b[1].total)
    .map(([id, { libelle }]) => ({ IDcat: id, libelle }))
  const catIndex = new Map(categories.map((c, i) => [c.IDcat, i]))
  const data: [number, number, number][] = []
  for (const row of rows) {
    const idx = catIndex.get(Number(row.IDcat))
    if (idx !== undefined) data.push([Number(row.m) - 1, idx, n(row.total)])
  }
  return { categories, data }
}
