import { badRequest, defineApiHandler } from '../../utils/errors'
import { assertCompteOwned } from '../../utils/scope'
import { rawQuery } from '../../utils/sql'
import { CHECKED_TOTALS, withoutNullTotals } from '../../utils/totals'
import { queryNumber } from '../../utils/validate'

export default defineApiHandler(async (event) => {
  const compteID = queryNumber(event, 'id')
  if (compteID === undefined) throw badRequest('id is required')
  await assertCompteOwned(event, compteID)
  const [row] = await rawQuery(
    `SELECT o.IDcompte AS IDCompte, ${CHECKED_TOTALS} FROM Operation o WHERE o.IDcompte = ? GROUP BY o.IDcompte`,
    [compteID]
  )
  return row ? withoutNullTotals(row) : {}
})
