import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { getPool } from '../db/client'

// SQL analytique brut, toujours paramétré (équivalent de repository.execute de LoopBack).
export const rawQuery = async <T = Record<string, any>>(sql: string, params: unknown[] = []): Promise<T[]> => {
  const [rows] = await getPool().query<RowDataPacket[]>(sql, params)
  return rows as unknown as T[]
}

// Écriture brute paramétrée (UPDATE / INSERT / DELETE) : renvoie affectedRows et insertId.
export const rawExecute = async (sql: string, params: unknown[] = []): Promise<{ affectedRows: number; insertId: number }> => {
  const [result] = await getPool().query<ResultSetHeader>(sql, params)
  return { affectedRows: result.affectedRows, insertId: result.insertId }
}
