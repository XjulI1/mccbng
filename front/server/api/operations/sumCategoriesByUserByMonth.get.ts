import { badRequest, defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'
import { rawQuery } from '../../utils/sql'
import { queryNumber } from '../../utils/validate'

export default defineApiHandler(async (event) => {
  const monthNumber = queryNumber(event, 'monthNumber')
  const yearNumber = queryNumber(event, 'yearNumber')
  if (monthNumber === undefined || yearNumber === undefined) throw badRequest('monthNumber and yearNumber are required')
  const userID = getCurrentUserId(event)
  return rawQuery(
    'SELECT ROUND(SUM(MontantOp), 2) as TotalMonth, IDcat ' +
    'FROM Operation ' +
    'NATURAL JOIN Compte ' +
    'WHERE MONTH(DateOp) = ? ' +
    'AND YEAR(DateOp) = ? ' +
    'AND Compte.IDuser = ? ' +
    'AND IDcat IN ' +
    "(SELECT IDcat FROM Categorie WHERE Type = 'depense' AND IDuser IN (0, ?)) " +
    'GROUP BY IDcat',
    [monthNumber, yearNumber, userID, userID]
  )
})
