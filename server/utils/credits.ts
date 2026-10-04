import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getDb } from '../db/client'
import { credits } from '../db/schema'
import { notFound } from './errors'
import { getCurrentUserId } from './scope'

export const findOwnedCredit = async (event: H3Event, id: number) => {
  const [credit] = await getDb().select().from(credits)
    .where(and(eq(credits.IDcredit, id), eq(credits.IDuser, getCurrentUserId(event)))).limit(1)
  if (!credit) throw notFound(`Credit ${id} not found`)
  return credit
}
