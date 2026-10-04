import { defineApiHandler } from '../../utils/errors'
import { getCurrentUserId } from '../../utils/scope'
import { findUserByIDuser } from '../../utils/users'

export default defineApiHandler(async (event) => {
  const { favoris, warningTotal, warningCompte, IDuser, email, username } = await findUserByIDuser(getCurrentUserId(event))
  return { favoris, warningTotal, warningCompte, IDuser, email, username }
})
