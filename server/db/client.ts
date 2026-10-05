import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import { createPool, type Pool } from 'mysql2/promise'
import * as schema from './schema'
import { getConfig } from '../utils/config'

export type Db = MySql2Database<typeof schema>

interface Holder { pool?: Pool; db?: Db }

// Singleton mis en cache sur globalThis (évite de multiplier les pools lors du HMR en dev).
const holder: Holder = ((globalThis as any).__mccbngDb ??= {})

export const getPool = (): Pool => {
  if (!holder.pool) {
    const { db } = getConfig()
    holder.pool = createPool({
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      database: db.database,
      connectionLimit: 10,
      // Dates lues/écrites en UTC (équivalent du comportement de juggler sur l'image Docker, TZ=UTC)
      timezone: 'Z',
      charset: 'utf8mb4',
      // DECIMAL (montants, taux, surface) lus comme des nombres JSON, pas des chaînes
      decimalNumbers: true
    })
  }
  return holder.pool
}

export const getDb = (): Db => (holder.db ??= drizzle(getPool(), { schema, mode: 'default' }))

export const closeDb = async () => {
  const pool = holder.pool
  holder.pool = undefined
  holder.db = undefined
  await pool?.end()
}
