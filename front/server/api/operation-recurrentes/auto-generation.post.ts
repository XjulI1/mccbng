import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { operationRecurrentes, operations } from '../../db/schema'
import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'
import { rawQuery } from '../../utils/sql'

const DAY_MS = 24 * 60 * 60 * 1000

// Génère au plus une occurrence par récurrente et par appel (comportement historique) :
// mensuelle si la dernière date remonte à plus de 15 jours, annuelle au-delà de 335 jours.
export default defineApiHandler(async (event) => {
  const userID = getCurrentUserId(event)
  const recurrentes = await rawQuery<any>(
    'SELECT * FROM OperationRecurrente NATURAL JOIN Compte WHERE IDuser = ?',
    [userID]
  )
  const now = Date.now()

  // Ordre historique : LoopBack dépilait la liste par la fin (pop), ce qui détermine l'ordre des IDop générés
  for (const rec of [...recurrentes].reverse()) {
    const last = new Date(rec.DernierDateOpRecu)
    last.setUTCHours(12)

    let next: Date | undefined
    if (rec.Frequence === 3 && now - last.getTime() > 15 * DAY_MS) {
      next = new Date(last)
      next.setUTCMonth(next.getUTCMonth() + 1)
    } else if (rec.Frequence === 7 && now - last.getTime() > 335 * DAY_MS) {
      next = new Date(last)
      next.setUTCFullYear(next.getUTCFullYear() + 1)
    }
    if (!next) continue

    // Date au jour près (comme l'ancien `toISOString().split('T')[0]`)
    const day = new Date(next.toISOString().split('T')[0]!)
    await getDb().transaction(async (tx) => {
      await tx.insert(operations).values({
        NomOp: rec.NomOpRecu,
        MontantOp: rec.MontantOpRecu,
        DateOp: day,
        IDcompte: rec.IDcompte,
        IDcat: rec.IDcat,
        CheckOp: false,
        IDcredit: rec.IDcredit ?? null
      })
      await tx.update(operationRecurrentes).set({ DernierDateOpRecu: day }).where(eq(operationRecurrentes.IDopRecu, rec.IDopRecu))
    })
  }
  return {}
})
