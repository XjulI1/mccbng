import { and, asc, eq } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { operations } from '../../../db/schema'
import { defineApiHandler } from '../../../utils/errors'
import { findOwnedCredit } from '../../../utils/credits'
import { compteScope } from '../../../utils/scope'
import { idParam } from '../../../utils/validate'

const round2 = (value: number) => Math.round(value * 100) / 100

// Amortissement : chaque paiement couvre d'abord les intérêts de la période, le reste réduit le principal.
export default defineApiHandler(async (event) => {
  const id = idParam(event)
  const credit = await findOwnedCredit(event, id)
  const payments = await getDb().select().from(operations).where(and(eq(operations.IDcredit, id), await compteScope(event, operations.IDcompte))).orderBy(asc(operations.DateOp))

  const monthlyRate = (credit.TauxInteret ?? 0) / 100 / 12
  let solde = credit.MontantInitial
  let paye = 0
  let interets = 0
  for (const payment of payments) {
    const montant = Math.abs(payment.MontantOp)
    const interet = solde * monthlyRate
    const principal = Math.min(solde, Math.max(0, montant - interet))
    interets += interet
    paye += principal
    solde -= principal
  }
  return { solde: round2(solde), paye: round2(paye), interets: round2(interets) }
})
