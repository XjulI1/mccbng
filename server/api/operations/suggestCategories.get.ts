import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'
import { rawQuery } from '../../utils/sql'
import { queryNumber, queryString } from '../../utils/validate'

// Catégories les plus fréquentes pour les opérations passées dont le nom ressemble (aide à la saisie, sans filtre de Type).
export default defineApiHandler(async (event) => {
  const operationName = queryString(event, 'operationName')
  if (!operationName || operationName.trim().length < 2) return []

  const userID = getCurrentUserId(event)
  const searchName = operationName.trim().toLowerCase()
  const limit = Math.min(Math.max(Math.floor(queryNumber(event, 'limit') ?? 5), 1), 50)

  const results = await rawQuery<{ IDcat: number; count: number }>(
    'SELECT IDcat, COUNT(*) as count ' +
    'FROM Operation ' +
    'NATURAL JOIN Compte ' +
    'WHERE Compte.IDuser = ? ' +
    'AND IDcat IS NOT NULL AND IDcat > 0 ' +
    'AND LOWER(NomOp) LIKE ? ' +
    'GROUP BY IDcat ' +
    'ORDER BY count DESC ' +
    'LIMIT ' + limit,
    [userID, `%${searchName}%`]
  )
  const total = results.reduce((sum, item) => sum + item.count, 0)
  return results.map(item => ({
    IDcat: item.IDcat,
    count: item.count,
    weight: total > 0 ? (item.count / total) * 100 : 0
  }))
})
