import { badRequest, defineApiHandler } from '../../utils/errors'
import { assertCompteOwned, getCurrentUserId } from '../../utils/scope'
import { rawQuery } from '../../utils/sql'
import { queryNumber } from '../../utils/validate'

// Total du mois, limité aux catégories Type='depense' (partagées + celles de l'utilisateur).
export default defineApiHandler(async (event) => {
  const monthNumber = queryNumber(event, 'monthNumber')
  const yearNumber = queryNumber(event, 'yearNumber')
  const idCompte = queryNumber(event, 'IDCompte')
  if (monthNumber === undefined || yearNumber === undefined) throw badRequest('monthNumber and yearNumber are required')
  const userID = getCurrentUserId(event)
  if (idCompte) await assertCompteOwned(event, idCompte)

  const params: unknown[] = [monthNumber, yearNumber, userID, userID]
  let sql =
    'SELECT ROUND(SUM(MontantOp), 2) as MonthNegative ' +
    'FROM Operation ' +
    'NATURAL JOIN Compte ' +
    'WHERE MONTH(DateOp) = ? ' +
    'AND YEAR(DateOp) = ? ' +
    'AND Compte.IDuser = ? ' +
    'AND IDcat IN ' +
    "(SELECT IDcat FROM Categorie WHERE Type = 'depense' AND IDuser IN (0, ?))"
  if (idCompte) {
    sql += ' AND IDCompte = ?'
    params.push(idCompte)
  }
  return rawQuery(sql, params)
})
