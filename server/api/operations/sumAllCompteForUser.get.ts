import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'
import { rawQuery } from '../../utils/sql'
import { CHECKED_TOTALS, withoutNullTotals } from '../../utils/totals'

// Totaux pointés / non pointés par compte visible (aucun filtre de catégorie : doit correspondre à la banque).
// Un côté absent (aucune opération pointée, ou aucune non pointée) est omis de la ligne ; le front le lit comme 0.
// Un compte dont `visible` vaut NULL (ancien compte) est visible.
export default defineApiHandler(async (event) => {
  const userID = getCurrentUserId(event)
  const rows = await rawQuery<any>(
    `SELECT o.IDcompte AS IDCompte, ${CHECKED_TOTALS} ` +
    'FROM Operation o INNER JOIN Compte c ON c.IDcompte = o.IDcompte ' +
    'WHERE c.IDuser = ? AND COALESCE(c.visible, 1) = 1 ' +
    'GROUP BY o.IDcompte',
    [userID]
  )
  return rows.map(withoutNullTotals)
})
