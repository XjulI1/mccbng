import { desc, eq } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { operations } from '../../../db/schema'
import { defineApiHandler } from '../../../utils/errors'
import { findOwnedCredit } from '../../../utils/credits'
import { idParam } from '../../../utils/validate'

export default defineApiHandler(async (event) => {
  const id = idParam(event)
  await findOwnedCredit(event, id)
  return getDb().select().from(operations).where(eq(operations.IDcredit, id)).orderBy(desc(operations.DateOp))
})
