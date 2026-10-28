import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId, getUserCompteIds } from '../../utils/scope'
import { recap } from '../../utils/stats'

export default defineApiHandler(async (event) => {
  const userID = getCurrentUserId(event)
  return recap(userID, await getUserCompteIds(userID), new Date())
})
