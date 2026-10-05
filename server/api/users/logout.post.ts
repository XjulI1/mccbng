import { eq, sql } from 'drizzle-orm'
import { setResponseStatus } from 'h3'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'
import { clearAuthCookie } from '../../utils/auth'
import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'

// Incrémenter tokenVersion révoque tous les JWT de l'utilisateur (tous ses appareils).
export default defineApiHandler(async (event) => {
  await getDb().update(users).set({ tokenVersion: sql`${users.tokenVersion} + 1` }).where(eq(users.IDuser, getCurrentUserId(event)))
  clearAuthCookie(event)
  setResponseStatus(event, 204)
  return null
})
