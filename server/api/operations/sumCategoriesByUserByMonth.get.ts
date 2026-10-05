import { badRequest, defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'
import { rawQuery } from '../../utils/sql'
import { EXPENSE_CAT, EXPENSE_JOIN, EXPENSE_WHERE } from '../../utils/stats'
import { queryNumber } from '../../utils/validate'

// Dépenses du mois par catégorie (Type='depense', catégorie « Aucune » comprise).
export default defineApiHandler(async (event) => {
  const monthNumber = queryNumber(event, 'monthNumber')
  const yearNumber = queryNumber(event, 'yearNumber')
  if (monthNumber === undefined || yearNumber === undefined) throw badRequest('monthNumber and yearNumber are required')
  const userID = getCurrentUserId(event)
  return rawQuery(
    `SELECT ROUND(SUM(o.MontantOp), 2) as TotalMonth, ${EXPENSE_CAT} AS IDcat ` +
    'FROM Operation o ' +
    'INNER JOIN Compte co ON co.IDcompte = o.IDcompte ' +
    EXPENSE_JOIN +
    'WHERE MONTH(o.DateOp) = ? ' +
    'AND YEAR(o.DateOp) = ? ' +
    'AND co.IDuser = ? ' +
    `AND ${EXPENSE_WHERE} ` +
    `GROUP BY ${EXPENSE_CAT}`,
    [userID, monthNumber, yearNumber, userID]
  )
})
