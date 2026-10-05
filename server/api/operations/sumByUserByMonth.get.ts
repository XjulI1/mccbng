import { badRequest, defineApiHandler } from '../../utils/errors'
import { assertCompteOwned, getCurrentUserId } from '../../utils/scope'
import { rawQuery } from '../../utils/sql'
import { EXPENSE_JOIN, EXPENSE_WHERE, monthRange } from '../../utils/stats'
import { queryNumber } from '../../utils/validate'

// Total dépensé du mois : catégories Type='depense' (partagées + celles de l'utilisateur).
export default defineApiHandler(async (event) => {
  const monthNumber = queryNumber(event, 'monthNumber')
  const yearNumber = queryNumber(event, 'yearNumber')
  const idCompte = queryNumber(event, 'IDCompte')
  if (monthNumber === undefined || yearNumber === undefined) throw badRequest('monthNumber and yearNumber are required')
  const month = monthRange(yearNumber, monthNumber)
  const userID = getCurrentUserId(event)
  if (idCompte) await assertCompteOwned(event, idCompte)

  const params: unknown[] = [userID, month.from, month.toExclusive, userID]
  let sql =
    'SELECT ROUND(SUM(o.MontantOp), 2) as MonthNegative ' +
    'FROM Operation o ' +
    'INNER JOIN Compte co ON co.IDcompte = o.IDcompte ' +
    EXPENSE_JOIN +
    'WHERE o.DateOp >= ? AND o.DateOp < ? ' +
    'AND co.IDuser = ? ' +
    `AND ${EXPENSE_WHERE}`
  if (idCompte) {
    sql += ' AND o.IDcompte = ?'
    params.push(idCompte)
  }
  return rawQuery(sql, params)
})
