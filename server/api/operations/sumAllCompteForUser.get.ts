import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'
import { rawQuery } from '../../utils/sql'

// Totaux pointés / non pointés par compte visible (aucun filtre de catégorie : doit correspondre à la banque).
// Un côté absent (aucune opération pointée, ou aucune non pointée) est omis de la ligne ; le front le lit comme 0.
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
  const merged = checked.map((row) => {
    const match = notChecked.find(other => other.IDCompte === row.IDCompte)
    return Object.assign(row, { TotalNotChecked: match?.TotalNotChecked })
  })
  // Correction : un compte dont toutes les opérations sont non pointées figurait absent de la liste (donc solde 0 à l'écran)
  const known = new Set(merged.map(row => row.IDCompte))
  return [...merged, ...notChecked.filter(row => !known.has(row.IDCompte))]
})
