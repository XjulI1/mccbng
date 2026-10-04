import { badRequest } from './errors'
import { rawQuery } from './sql'

export const MAX_LIMIT = 50
const DEFAULT_LIMIT = 10

export const clampLimit = (value?: number): number => {
  if (!value || Number.isNaN(value)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.floor(value), 1), MAX_LIMIT)
}

export const assertValidRange = (from?: string, to?: string): void => {
  if (!from || !to) throw badRequest('from and to are required')
  if (Date.parse(from) > Date.parse(to)) throw badRequest('from must be earlier than to')
}

const placeholders = (ids: number[]) => ids.map(() => '?').join(',')
const n = (value: unknown) => Number(value) || 0

export const evolutionSolde = async (userID: number) => {
  const dates = "DATE_FORMAT(DateOp, '%Y-%m-%dT00:00:00.000Z') AS date "
  const [soldeGlobal, soldeRetraite, soldeDispo, global, retraite, dispo] = await Promise.all([
    rawQuery('SELECT ROUND(SUM(solde), 2) AS sum FROM Compte WHERE retraite = 0 AND children = 0 AND IDuser = ?', [userID]),
    rawQuery('SELECT ROUND(SUM(solde), 2) AS sum FROM Compte WHERE retraite = 1 AND IDuser = ?', [userID]),
    rawQuery('SELECT ROUND(SUM(solde), 2) AS sum FROM Compte WHERE IDuser = ? AND bloque = 0', [userID]),
    rawQuery(
      `SELECT ROUND(SUM(MontantOp),2) AS montant, ${dates}` +
      'FROM Operation NATURAL JOIN Compte WHERE IDuser = ? AND retraite = 0 AND children = 0 GROUP BY date ORDER BY date ASC',
      [userID]
    ),
    rawQuery(
      `SELECT ROUND(SUM(MontantOp),2) AS montant, ${dates}` +
      'FROM Operation NATURAL JOIN Compte WHERE IDuser = ? AND retraite = 1 GROUP BY date ORDER BY date ASC',
      [userID]
    ),
    rawQuery(
      `SELECT ROUND(SUM(MontantOp),2) AS montant, ${dates}` +
      'FROM Operation NATURAL JOIN Compte WHERE IDuser = ? AND bloque = 0 GROUP BY date ORDER BY date ASC',
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

// Dépense nette par mois sur deux années (catégories Type='depense' uniquement ; un remboursement rangé
// dans une catégorie de dépense vient en déduction). Tableaux de 12 mois + écart en % de yearB vs yearA.
export const yearComparison = async (userID: number, compteIds: number[], yearA: number, yearB: number) => {
  if (!compteIds.length) {
    return { yearA: new Array(12).fill(0), yearB: new Array(12).fill(0), deltaPct: new Array(12).fill(null) }
  }
  const rows = await rawQuery<{ y: number | string; m: number | string; total: number | string }>(
    'SELECT YEAR(DateOp) AS y, MONTH(DateOp) AS m, ROUND(SUM(MontantOp), 2) AS total ' +
    'FROM Operation ' +
    `WHERE IDcompte IN (${placeholders(compteIds)}) ` +
    'AND YEAR(DateOp) IN (?, ?) ' +
    'AND IDcat IN ' +
    "(SELECT IDcat FROM Categorie WHERE Type = 'depense' AND IDuser IN (0, ?)) " +
    'GROUP BY YEAR(DateOp), MONTH(DateOp)',
    [...compteIds, yearA, yearB, userID]
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

// Plus grosses catégories de dépense sur une période (dépenses négatives : tri ASC).
export const topCategories = async (userID: number, compteIds: number[], from: string, to: string, limit: number) => {
  if (!compteIds.length) return []
  return rawQuery(
    'SELECT o.IDcat AS IDcat, c.Nom AS libelle, ROUND(SUM(o.MontantOp), 2) AS total ' +
    'FROM Operation o ' +
    'INNER JOIN Categorie c ON c.IDcat = o.IDcat ' +
    `WHERE o.IDcompte IN (${placeholders(compteIds)}) ` +
    'AND o.DateOp >= ? AND o.DateOp <= ? ' +
    "AND c.Type = 'depense' AND c.IDuser IN (0, ?) " +
    'GROUP BY o.IDcat, c.Nom ' +
    'ORDER BY total ASC ' +
    'LIMIT ?',
    [...compteIds, from, to, userID, limit]
  )
}

// Regroupe par Type de catégorie (et non par signe) : un remboursement rangé en dépense n'est pas un revenu.
export const incomeVsExpense = async (userID: number, compteIds: number[], yearNumber: number) => {
  if (!compteIds.length) return { income: new Array(12).fill(0), expense: new Array(12).fill(0) }
  const rows = await rawQuery<{ m: number | string; income: number | string; expense: number | string }>(
    'SELECT MONTH(o.DateOp) AS m, ' +
    "ROUND(SUM(CASE WHEN c.Type = 'revenu' THEN o.MontantOp ELSE 0 END), 2) AS income, " +
    "ROUND(SUM(CASE WHEN c.Type = 'depense' THEN o.MontantOp ELSE 0 END), 2) AS expense " +
    'FROM Operation o ' +
    'INNER JOIN Categorie c ON c.IDcat = o.IDcat ' +
    `WHERE o.IDcompte IN (${placeholders(compteIds)}) ` +
    'AND YEAR(o.DateOp) = ? ' +
    "AND c.Type IN ('depense','revenu') AND c.IDuser IN (0, ?) " +
    'GROUP BY MONTH(o.DateOp)',
    [...compteIds, yearNumber, userID]
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

// Plus grosses opérations (valeur absolue) ; les transferts sont exclus.
export const topOperations = async (userID: number, compteIds: number[], from: string, to: string, limit: number) => {
  if (!compteIds.length) return []
  return rawQuery(
    'SELECT o.IDop, o.NomOp, o.MontantOp, o.DateOp, o.IDcat, o.IDcompte ' +
    'FROM Operation o ' +
    'INNER JOIN Categorie c ON c.IDcat = o.IDcat ' +
    `WHERE o.IDcompte IN (${placeholders(compteIds)}) ` +
    'AND o.DateOp >= ? AND o.DateOp <= ? ' +
    "AND c.Type IN ('depense','revenu') AND c.IDuser IN (0, ?) " +
    'ORDER BY ABS(o.MontantOp) DESC ' +
    'LIMIT ?',
    [...compteIds, from, to, userID, limit]
  )
}

// Matrice mois (0-11) × catégorie, au format d'entrée d'une heatmap Highcharts.
export const categoryHeatmap = async (userID: number, compteIds: number[], yearNumber: number) => {
  if (!compteIds.length) return { categories: [], data: [] }
  const rows = await rawQuery<{ m: number | string; IDcat: number | string; libelle: string; total: number | string }>(
    'SELECT MONTH(o.DateOp) AS m, o.IDcat AS IDcat, c.Nom AS libelle, ROUND(SUM(o.MontantOp), 2) AS total ' +
    'FROM Operation o ' +
    'INNER JOIN Categorie c ON c.IDcat = o.IDcat ' +
    `WHERE o.IDcompte IN (${placeholders(compteIds)}) ` +
    'AND YEAR(o.DateOp) = ? ' +
    "AND c.Type = 'depense' AND c.IDuser IN (0, ?) " +
    'GROUP BY MONTH(o.DateOp), o.IDcat, c.Nom',
    [...compteIds, yearNumber, userID]
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
