import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { users } from '../db/schema'
import { unauthorized } from './errors'

export type UserRow = typeof users.$inferSelect

// Hash factice : on compare toujours, même si l'email est inconnu, pour égaliser les temps de réponse.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8eVjvJ6gQzUk6lIjJ0nFv2YPm0jQOG'
const INVALID_CREDENTIALS = 'Invalid email or code.'

export const findUserByEmail = async (email: string): Promise<UserRow | undefined> =>
  (await getDb().select().from(users).where(eq(users.email, email)).limit(1))[0]

export const findUserById = async (id: string): Promise<UserRow> => {
  const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1)
  if (!user) throw unauthorized('invalid User')
  return user
}

export const verifyCredentials = async (credentials: { email?: string; code?: string }): Promise<UserRow> => {
  if (!credentials.email || !credentials.code) throw unauthorized(INVALID_CREDENTIALS)

  const found = await findUserByEmail(credentials.email)
  const stored = found?.secret_key ?? DUMMY_HASH
  const isBcrypt = stored.startsWith('$2')
  // Utilisateurs historiques : secret_key encore en clair (un hash bcrypt commence toujours par "$2")
  const matched = isBcrypt ? await bcrypt.compare(credentials.code, stored) : stored === credentials.code
  if (!found || !matched) throw unauthorized(INVALID_CREDENTIALS)

  // Migration paresseuse : on hashe la clé en clair à la première connexion réussie (échec toléré)
  if (!isBcrypt) {
    try {
      await getDb().update(users).set({ secret_key: await bcrypt.hash(credentials.code, 12) }).where(eq(users.id, found.id))
    } catch {
      // la connexion a réussi, nouvelle tentative au prochain login
    }
  }
  return found
}
