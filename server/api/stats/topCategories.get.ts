import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId, getUserCompteIds } from '../../utils/scope'
import { assertValidRange, clampLimit, topCategories } from '../../utils/stats'
import { queryNumber, queryString } from '../../utils/validate'

export default defineApiHandler(async (event) => {
  const from = queryString(event, 'from')
  const to = queryString(event, 'to')
  assertValidRange(from, to)
  const userID = getCurrentUserId(event)
  return topCategories(userID, await getUserCompteIds(userID), from!, to!, clampLimit(queryNumber(event, 'limit')))
})
