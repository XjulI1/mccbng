import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'
import { escapeLike, rawQuery } from '../../utils/sql'
import { queryNumber, queryString } from '../../utils/validate'

// Catégories les plus fréquentes pour les opérations passées dont le nom ressemble (aide à la saisie, sans filtre de Type).
// La collation utf8mb4_unicode_ci rend la comparaison insensible à la casse (et aux accents).
export default defineApiHandler(async (event) => {
  const operationName = queryString(event, 'operationName')
  if (!operationName || operationName.trim().length < 2) return []

  const userID = getCurrentUserId(event)
  const searchName = escapeLike(operationName.trim())
  const limit = Math.min(Math.max(Math.floor(queryNumber(event, 'limit') ?? 5), 1), 50)

  const results = await rawQuery<{ IDcat: number; count: number }>(
    'SELECT IDcat, COUNT(*) as count ' +
    'FROM Operation ' +
    'JOIN Compte USING (IDcompte) ' +
    'WHERE Compte.IDuser = ? ' +
    'AND IDcat IS NOT NULL AND IDcat > 0 ' +
    "AND NomOp LIKE ? ESCAPE '\\\\' " +
    'GROUP BY IDcat ' +
    'ORDER BY count DESC, IDcat ASC ' +
    'LIMIT ?',
    [userID, `%${searchName}%`, limit]
  )
  const total = results.reduce((sum, item) => sum + item.count, 0)
  return results.map(item => ({
    IDcat: item.IDcat,
    count: item.count,
    weight: total > 0 ? (item.count / total) * 100 : 0
  }))
})
