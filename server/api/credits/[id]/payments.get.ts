import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { operations } from '../../../db/schema'
import { defineApiHandler } from '../../../utils/errors'
import { findOwnedCredit } from '../../../utils/credits'
import { compteScope } from '../../../utils/scope'
import { idParam } from '../../../utils/validate'

export default defineApiHandler(async (event) => {
  const id = idParam(event)
  await findOwnedCredit(event, id)
  return getDb().select().from(operations).where(and(eq(operations.IDcredit, id), await compteScope(event, operations.IDcompte))).orderBy(desc(operations.DateOp))
})
