import bcrypt from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { users } from '../db/schema'
import { unauthorized } from './errors'

export type UserRow = typeof users.$inferSelect

// Hash factice de même coût (12) que les vrais : on compare toujours, même si l'email est inconnu, pour égaliser les temps de réponse.
const DUMMY_HASH = '$2b$12$1lxs/P0tJklEB0dX2Oe1ROd80YlRaBCyHGYw7m2tioiRiMLEU6Aaq'
const INVALID_CREDENTIALS = 'Invalid email or code.'

// Verrouillage : au 5e échec consécutif, puis à chaque nouvel échec, palier suivant (plafonné au dernier).
export const LOCKOUT_THRESHOLD = 5
export const LOCKOUT_DELAYS_MS = [5 * 60_000, 30 * 60_000, 2 * 3600_000, 24 * 3600_000]

export const lockoutDelayMs = (failedLoginCount: number): number | undefined =>
  failedLoginCount < LOCKOUT_THRESHOLD
    ? undefined
    : LOCKOUT_DELAYS_MS[Math.min(failedLoginCount - LOCKOUT_THRESHOLD, LOCKOUT_DELAYS_MS.length - 1)]

const findUserByEmail = async (email: string): Promise<UserRow | undefined> =>
  (await getDb().select().from(users).where(eq(users.email, email)).limit(1))[0]

// Les utilisateurs sont retrouvés par IDuser (clé primaire) : la colonne `id` n'est pas unique en production
// (identifiants historiques courts, lignes dupliquées à la main) et ferait lire le profil d'un autre utilisateur.
export const findUserByIDuser = async (IDuser: number): Promise<UserRow> => {
  const [user] = await getDb().select().from(users).where(eq(users.IDuser, IDuser)).limit(1)
  if (!user) throw unauthorized('invalid User')
  return user
}

export interface LoginContext { ip: string; userAgent?: string }
type LoginResult = 'success' | 'failure' | 'locked'

// Journal structuré des tentatives : jamais le code saisi ni la secret_key.
const logAttempt = (result: LoginResult, IDuser: number | null, context: LoginContext) => {
  console.info(JSON.stringify({
    event: 'login', result, IDuser, ip: context.ip, userAgent: context.userAgent ?? null, at: new Date().toISOString()
  }))
}

const recordFailure = async (user: UserRow) => {
  const db = getDb()
  await db.update(users).set({ failedLoginCount: sql`${users.failedLoginCount} + 1` }).where(eq(users.IDuser, user.IDuser))
  const [row] = await db.select({ failedLoginCount: users.failedLoginCount }).from(users).where(eq(users.IDuser, user.IDuser)).limit(1)
  const delay = lockoutDelayMs(row?.failedLoginCount ?? 0)
  if (delay !== undefined) {
    await db.update(users).set({ lockedUntil: new Date(Date.now() + delay) }).where(eq(users.IDuser, user.IDuser))
  }
}

export const verifyCredentials = async (credentials: { email?: string; code?: string }, context: LoginContext): Promise<UserRow> => {
  if (!credentials.email || !credentials.code) throw unauthorized(INVALID_CREDENTIALS)

  const found = await findUserByEmail(credentials.email)

  // Compte verrouillé : même réponse qu'un mauvais code, sans bcrypt (ni révélation du verrouillage, ni coût CPU)
  if (found?.lockedUntil && found.lockedUntil.getTime() > Date.now()) {
    logAttempt('locked', found.IDuser, context)
    throw unauthorized(INVALID_CREDENTIALS)
  }

  // Seuls les hash bcrypt sont acceptés : une secret_key en clair est refusée (comparée au hash factice)
  const stored = found?.secret_key?.startsWith('$2') ? found.secret_key : DUMMY_HASH
  const matched = await bcrypt.compare(credentials.code, stored)
  if (!found || !matched || stored === DUMMY_HASH) {
    if (found) await recordFailure(found)
    logAttempt('failure', found?.IDuser ?? null, context)
    throw unauthorized(INVALID_CREDENTIALS)
  }

  if (found.failedLoginCount || found.lockedUntil) {
    await getDb().update(users).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(users.IDuser, found.IDuser))
  }
  logAttempt('success', found.IDuser, context)
  return found
}
