import { amortize } from '../../../utils/amortization'
import { defineApiHandler } from '../../../utils/errors'
import { findCreditPayments, findOwnedCredit } from '../../../utils/credits'
import { round2 } from '../../../utils/money'
import { idParam } from '../../../utils/validate'

export default defineApiHandler(async (event) => {
  const id = idParam(event)
  const credit = await findOwnedCredit(event, id)
  const { solde, paye, interets } = amortize(credit, await findCreditPayments(event, id))
  return { solde: round2(solde), paye: round2(paye), interets: round2(interets) }
})
