import { and, eq, or } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { biens, operations } from '../../../db/schema'
import { findOwnedCredit } from '../../../utils/credits'
import { defineApiHandler } from '../../../utils/errors'
import { creditRentabilite, flowColumns } from '../../../utils/rentabilite'
import { compteScope, getCurrentUserId } from '../../../utils/scope'
import { idParam } from '../../../utils/validate'

export default defineApiHandler(async (event) => {
  const id = idParam(event)
  const credit = await findOwnedCredit(event, id)
  const [bien = null] = await getDb()
    .select({
      IDbien: biens.IDbien, LoyerMensuel: biens.LoyerMensuel,
      AbattementCharges: biens.AbattementCharges, DateMiseEnLocation: biens.DateMiseEnLocation
    })
    .from(biens)
    .where(and(eq(biens.IDcredit, id), eq(biens.IDuser, getCurrentUserId(event)))).orderBy(biens.IDbien).limit(1)
  const linkedToCredit = bien ? or(eq(operations.IDcredit, id), eq(operations.IDbien, bien.IDbien)) : eq(operations.IDcredit, id)
  const flows = await getDb().select(flowColumns).from(operations)
    .where(and(linkedToCredit, await compteScope(event, operations.IDcompte)))
  return creditRentabilite(credit, bien, flows, new Date())
})
