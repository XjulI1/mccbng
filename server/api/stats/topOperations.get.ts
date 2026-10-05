import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId, getUserCompteIds } from '../../utils/scope'
import { parseRange, clampLimit, topOperations } from '../../utils/stats'
import { queryNumber, queryString } from '../../utils/validate'

export default defineApiHandler(async (event) => {
  const from = queryString(event, 'from')
  const to = queryString(event, 'to')
  const range = parseRange(from, to)
  const userID = getCurrentUserId(event)
  return topOperations(userID, await getUserCompteIds(userID), range.from, range.toExclusive, clampLimit(queryNumber(event, 'limit')))
})
