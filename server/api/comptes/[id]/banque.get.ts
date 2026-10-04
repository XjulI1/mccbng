import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { banques, comptes } from '../../../db/schema'
import { defineApiHandler, notFound } from '../../../utils/errors'
import { getCurrentUserId } from '../../../utils/scope'
import { idParam } from '../../../utils/validate'

export default defineApiHandler(async (event) => {
  const id = idParam(event)
  const [compte] = await getDb().select().from(comptes).where(and(eq(comptes.IDcompte, id), eq(comptes.IDuser, getCurrentUserId(event)))).limit(1)
  if (!compte) throw notFound(`Compte ${id} not found`)
  if (compte.IDbanque == null) throw notFound(`Banque for Compte ${id} not found`)
  const [banque] = await getDb().select().from(banques).where(eq(banques.IDbanque, compte.IDbanque)).limit(1)
  if (!banque) throw notFound(`Entity not found: Banque with id ${compte.IDbanque}`)
  return banque
})
