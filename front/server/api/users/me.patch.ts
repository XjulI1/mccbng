import { and, eq, ne } from 'drizzle-orm'
import { setResponseStatus } from 'h3'
import { z } from 'zod'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'
import { conflict, defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'
import { numeric, parseBody } from '../../utils/validate'

// Seuls ces champs sont modifiables ; tout autre champ (ex. secret_key) est rejeté.
const updates = z.strictObject({
  email: z.string().email().max(254).optional(),
  username: z.string().max(512).optional(),
  warningTotal: numeric.optional(),
  warningCompte: numeric.optional(),
  favoris: numeric.optional()
})

export default defineApiHandler(async (event) => {
  const userId = getCurrentUserId(event)
  const data = await parseBody(event, updates)
  const set = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))

  if (data.email) {
    const [other] = await getDb().select({ id: users.id }).from(users).where(and(eq(users.email, data.email), ne(users.IDuser, userId))).limit(1)
    if (other) throw conflict('A user with this email already exists')
  }
  if (Object.keys(set).length) await getDb().update(users).set(set).where(eq(users.IDuser, userId))
  setResponseStatus(event, 204)
  return null
})
