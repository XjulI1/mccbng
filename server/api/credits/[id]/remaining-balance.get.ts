import { and, asc, eq, lt } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { operations } from '../../../db/schema'
import { defineApiHandler } from '../../../utils/errors'
import { findOwnedCredit } from '../../../utils/credits'
import { round2 } from '../../../utils/money'
import { addDays, startOfUtcDay } from '../../../utils/schedule'
import { compteScope } from '../../../utils/scope'
import { idParam } from '../../../utils/validate'

// Index de mois civil : le jour exact d'un prélèvement n'influe pas sur le décompte des intérêts.
const monthIndex = (date: Date) => date.getUTCFullYear() * 12 + date.getUTCMonth()

// Amortissement : seules les sorties passées comptent (ni déblocage, ni échéance générée par anticipation).
// Les intérêts courent par mois civil écoulé depuis le mois de DateDebut, puis depuis le mois du paiement
// précédent ; chaque paiement couvre d'abord ces intérêts, le reste réduit le principal.
export default defineApiHandler(async (event) => {
  const id = idParam(event)
  const credit = await findOwnedCredit(event, id)
  const tomorrow = addDays(startOfUtcDay(new Date()), 1)
  const payments = await getDb().select().from(operations).where(and(
    eq(operations.IDcredit, id),
    await compteScope(event, operations.IDcompte),
    lt(operations.MontantOp, 0),
    lt(operations.DateOp, tomorrow)
  )).orderBy(asc(operations.DateOp))

  const monthlyRate = (credit.TauxInteret ?? 0) / 100 / 12
  let solde = credit.MontantInitial
  let cursor = monthIndex(credit.DateDebut)
  let paye = 0
  let interets = 0
  for (const payment of payments) {
    const month = monthIndex(payment.DateOp)
    const interet = solde * monthlyRate * Math.max(0, month - cursor)
    const principal = Math.min(solde, Math.max(0, Math.abs(payment.MontantOp) - interet))
    interets += interet
    paye += principal
    solde -= principal
    cursor = Math.max(cursor, month)
  }
  return { solde: round2(solde), paye: round2(paye), interets: round2(interets) }
})
