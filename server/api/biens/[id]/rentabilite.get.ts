import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getDb } from '../../../db/client'
import { operations, type biens } from '../../../db/schema'
import { findOwned } from '../../../utils/crud'
import { findCreditPayments, ownedCredit } from '../../../utils/credits'
import { defineApiHandler } from '../../../utils/errors'
import { bienRentabilite, flowColumns, paidOnCredit } from '../../../utils/rentabilite'
import { bienResource } from '../../../utils/resources'
import { compteScope } from '../../../utils/scope'
import { idParam } from '../../../utils/validate'

const paidOnLinkedCredit = async (event: H3Event, IDcredit: number | null) => {
  const credit = IDcredit ? await ownedCredit(event, IDcredit) : undefined
  return credit ? paidOnCredit(credit, await findCreditPayments(event, credit.IDcredit)) : null
}

export default defineApiHandler(async (event) => {
  const bien = await findOwned(bienResource, event, idParam(event), false) as typeof biens.$inferSelect
  const flows = await getDb().select(flowColumns).from(operations)
    .where(and(eq(operations.IDbien, bien.IDbien), await compteScope(event, operations.IDcompte)))
  return bienRentabilite(bien, flows, new Date(), await paidOnLinkedCredit(event, bien.IDcredit))
})
