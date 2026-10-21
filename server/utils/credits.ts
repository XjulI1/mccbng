import { and, asc, eq, lt } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getDb } from '../db/client'
import { credits, operations } from '../db/schema'
import { notFound } from './errors'
import { addDays, startOfUtcDay } from './schedule'
import { compteScope, getCurrentUserId } from './scope'

export const ownedCredit = async (event: H3Event, id: number) => {
  const [credit] = await getDb().select().from(credits)
    .where(and(eq(credits.IDcredit, id), eq(credits.IDuser, getCurrentUserId(event)))).limit(1)
  return credit
}

export const findOwnedCredit = async (event: H3Event, id: number) => {
  const credit = await ownedCredit(event, id)
  if (!credit) throw notFound(`Credit ${id} not found`)
  return credit
}

export const findCreditPayments = async (event: H3Event, id: number) =>
  getDb().select({ MontantOp: operations.MontantOp, DateOp: operations.DateOp }).from(operations).where(and(
    eq(operations.IDcredit, id),
    await compteScope(event, operations.IDcompte),
    lt(operations.MontantOp, 0),
    lt(operations.DateOp, addDays(startOfUtcDay(new Date()), 1))
  )).orderBy(asc(operations.DateOp))
