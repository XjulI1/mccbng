import { desc, eq, sql } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { comptes, credits, operationRecurrentes, operations } from '../../db/schema'
import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'

// Pour chaque compte : date de dernière opération et indicateur « référencé » (donc non supprimable).
export default defineApiHandler(async (event) => {
  const db = getDb()
  const mine = await db.select({ id: comptes.IDcompte }).from(comptes).where(eq(comptes.IDuser, getCurrentUserId(event)))
  return Promise.all(mine.map(async ({ id }) => {
    const [[lastOp], [recurrentes], [loans]] = await Promise.all([
      db.select({ date: operations.DateOp }).from(operations).where(eq(operations.IDcompte, id)).orderBy(desc(operations.DateOp)).limit(1),
      db.select({ n: sql<number>`count(*)` }).from(operationRecurrentes).where(eq(operationRecurrentes.IDcompte, id)),
      db.select({ n: sql<number>`count(*)` }).from(credits).where(eq(credits.IDcompte, id))
    ])
    return {
      IDcompte: id,
      lastOpDate: lastOp?.date ? lastOp.date.toISOString() : null,
      hasReferences: !!lastOp || Number(recurrentes?.n) > 0 || Number(loans?.n) > 0
    }
  }))
})
