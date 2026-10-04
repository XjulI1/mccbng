import { badRequest, defineApiHandler } from '../../utils/errors'
import { getCurrentUserId, getUserCompteIds } from '../../utils/scope'
import { incomeVsExpense } from '../../utils/stats'
import { queryNumber } from '../../utils/validate'

export default defineApiHandler(async (event) => {
  const yearNumber = queryNumber(event, 'yearNumber')
  if (!yearNumber) throw badRequest('yearNumber is required')
  const userID = getCurrentUserId(event)
  return incomeVsExpense(userID, await getUserCompteIds(userID), yearNumber)
})
