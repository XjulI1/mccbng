import { badRequest, defineApiHandler } from '../../utils/errors'
import { getCurrentUserId, getUserCompteIds } from '../../utils/scope'
import { yearComparison } from '../../utils/stats'
import { queryNumber } from '../../utils/validate'

export default defineApiHandler(async (event) => {
  const yearA = queryNumber(event, 'yearA')
  const yearB = queryNumber(event, 'yearB')
  if (!yearA || !yearB) throw badRequest('yearA and yearB are required')
  const userID = getCurrentUserId(event)
  return yearComparison(userID, await getUserCompteIds(userID), yearA, yearB)
})
