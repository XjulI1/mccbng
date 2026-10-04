import { eq, inArray, and, type SQL } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getDb } from '../db/client'
import { comptes } from '../db/schema'
import { requireAuth } from './auth'
import { notFound, unauthorized } from './errors'

export const getCurrentUserId = (event: H3Event): number => {
  const id = requireAuth(event).IDuser
  if (typeof id !== 'number') throw unauthorized('Missing user identifier in token')
  return id
}

// Identifiants des comptes de l'utilisateur (scope hérité d'Operation et OperationRecurrente).
export const getUserCompteIds = async (userId: number): Promise<number[]> => {
  const rows = await getDb().select({ id: comptes.IDcompte }).from(comptes).where(eq(comptes.IDuser, userId))
  return rows.map(row => row.id)
}

// Scope hérité : IDcompte ∈ comptes de l'utilisateur (aucune ligne si l'utilisateur n'a pas de compte).
export const compteScope = async (event: H3Event, column: Parameters<typeof inArray>[0]): Promise<SQL> => {
  const ids = await getUserCompteIds(getCurrentUserId(event))
  return ids.length ? inArray(column, ids) : (eq(column, -1) as SQL)
}

export const assertCompteOwned = async (event: H3Event, compteId: number): Promise<void> => {
  const [row] = await getDb().select({ id: comptes.IDcompte }).from(comptes)
    .where(and(eq(comptes.IDcompte, compteId), eq(comptes.IDuser, getCurrentUserId(event)))).limit(1)
  if (!row) throw notFound(`Compte ${compteId} not found`)
}
