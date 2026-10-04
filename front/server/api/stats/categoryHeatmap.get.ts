import { badRequest, defineApiHandler } from '../../utils/errors'
import { getCurrentUserId, getUserCompteIds } from '../../utils/scope'
import { categoryHeatmap } from '../../utils/stats'
import { queryNumber } from '../../utils/validate'

export default defineApiHandler(async (event) => {
  const yearNumber = queryNumber(event, 'yearNumber')
  if (!yearNumber) throw badRequest('yearNumber is required')
  const userID = getCurrentUserId(event)
  return categoryHeatmap(userID, await getUserCompteIds(userID), yearNumber)
})
