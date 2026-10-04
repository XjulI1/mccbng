import { badRequest, defineApiHandler } from '../../utils/errors'
import { assertCompteOwned } from '../../utils/scope'
import { rawQuery } from '../../utils/sql'
import { queryNumber } from '../../utils/validate'

export default defineApiHandler(async (event) => {
  const compteID = queryNumber(event, 'id')
  if (compteID === undefined) throw badRequest('id is required')
  await assertCompteOwned(event, compteID)
  const [checked] = await rawQuery(
    'SELECT IDCompte, SUM(MontantOp) as TotalChecked FROM Operation WHERE IDcompte = ? AND CheckOp = true GROUP BY IDCompte',
    [compteID]
  )
  const [notChecked] = await rawQuery(
    'SELECT IDCompte, SUM(MontantOp) as TotalNotChecked FROM Operation WHERE IDcompte = ? AND CheckOp = false GROUP BY IDCompte',
    [compteID]
  )
  return Object.assign(checked ?? {}, notChecked ?? {})
})
