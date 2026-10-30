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
    // Only a rented bien has rents: a refund linked to a home lived in must not show as one on its credit
    .where(and(eq(biens.IDcredit, id), eq(biens.IDuser, getCurrentUserId(event)), eq(biens.Usage, 'locatif')))
    .orderBy(biens.IDbien).limit(1)
  const linkedToCredit = bien ? or(eq(operations.IDcredit, id), eq(operations.IDbien, bien.IDbien)) : eq(operations.IDcredit, id)
  const flows = await getDb().select(flowColumns).from(operations)
    .where(and(linkedToCredit, await compteScope(event, operations.IDcompte)))
  return creditRentabilite(credit, bien, flows, new Date())
})
