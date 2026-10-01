import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'
import { rawQuery } from '../../utils/sql'

// Totaux pointés / non pointés par compte visible (aucun filtre de catégorie : doit correspondre à la banque).
export default defineApiHandler(async (event) => {
  const userID = getCurrentUserId(event)
  const checked = await rawQuery<any>(
    'SELECT IDCompte, SUM(MontantOp) as TotalChecked ' +
    'FROM Operation NATURAL JOIN Compte ' +
    'WHERE IDuser = ? AND CheckOp = true AND Compte.visible = 1 ' +
    'GROUP BY IDCompte',
    [userID]
  )
  const notChecked = await rawQuery<any>(
    'SELECT IDCompte, SUM(MontantOp) as TotalNotChecked ' +
    'FROM Operation NATURAL JOIN Compte  ' +
    'WHERE IDuser = ? AND CheckOp = false AND Compte.visible = 1 ' +
    'GROUP BY IDCompte',
    [userID]
  )
  return checked.map((row) => {
    const match = notChecked.find(other => other.IDCompte === row.IDCompte)
    return Object.assign(row, { TotalNotChecked: match?.TotalNotChecked })
  })
})
