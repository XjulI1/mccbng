import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import { userCredentials, users } from '../db/schema'
import { badRequest, conflict, defineApiHandler } from '../utils/errors'
import { numeric, parseBody } from '../utils/validate'

const newUser = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1),
  secret_key: z.string().optional(),
  // IDuser est la clé primaire de User (sans auto-incrément) : obligatoire
  IDuser: numeric,
  username: z.string().optional(),
  warningTotal: numeric.optional(),
  warningCompte: numeric.optional(),
  favoris: numeric.optional()
})

// Route protégée par le middleware d'authentification (comportement historique : tout utilisateur connecté peut créer un compte).
export default defineApiHandler(async (event) => {
  const { password, secret_key, ...rest } = await parseBody(event, newUser)
  const db = getDb()

  const [sameEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, rest.email)).limit(1)
  if (sameEmail) throw conflict('A user with this email already exists')

  const [sameId] = await db.select({ id: users.id }).from(users).where(eq(users.IDuser, rest.IDuser)).limit(1)
  if (sameId) throw conflict('IDuser is already in use')
  if (!secret_key || secret_key.length !== 6) throw badRequest('secret_key must be exactly 6 characters')

  const id = randomUUID()
  const hashedSecret = await bcrypt.hash(secret_key, 12)
  const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt())

  await db.transaction(async (tx) => {
    await tx.insert(users).values({ ...rest, id, secret_key: hashedSecret })
    await tx.insert(userCredentials).values({ id: randomUUID(), password: hashedPassword, userId: id })
  })

  // secret_key (même hashée) n'est jamais renvoyée
  const { secret_key: _omit, ...created } = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0]!
  return created
})
