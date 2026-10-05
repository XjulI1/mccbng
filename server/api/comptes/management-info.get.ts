import { asc, count, eq, inArray, max } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { comptes, credits, operationRecurrentes, operations } from '../../db/schema'
import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'

// Pour chaque compte : date de dernière opération et indicateur « référencé » (donc non supprimable).
// Trois requêtes groupées pour l'ensemble des comptes, quel que soit leur nombre.
export default defineApiHandler(async (event) => {
  const db = getDb()
  const mine = await db.select({ id: comptes.IDcompte }).from(comptes)
    .where(eq(comptes.IDuser, getCurrentUserId(event))).orderBy(asc(comptes.IDcompte))
  if (!mine.length) return []
  const ids = mine.map(({ id }) => id)

  const [lastOps, recurrentes, loans] = await Promise.all([
    db.select({ id: operations.IDcompte, date: max(operations.DateOp) }).from(operations)
      .where(inArray(operations.IDcompte, ids)).groupBy(operations.IDcompte),
    db.select({ id: operationRecurrentes.IDcompte, n: count() }).from(operationRecurrentes)
      .where(inArray(operationRecurrentes.IDcompte, ids)).groupBy(operationRecurrentes.IDcompte),
    db.select({ id: credits.IDcompte, n: count() }).from(credits)
      .where(inArray(credits.IDcompte, ids)).groupBy(credits.IDcompte)
  ])
  const lastOpDate = new Map(lastOps.map(row => [row.id, row.date]))
  const referenced = new Set([...recurrentes, ...loans].filter(row => Number(row.n) > 0).map(row => row.id))

  return ids.map((id) => {
    const date = lastOpDate.get(id)
    return {
      IDcompte: id,
      lastOpDate: date ? date.toISOString() : null,
      hasReferences: lastOpDate.has(id) || referenced.has(id)
    }
  })
})
