import { requireAuth } from '../../utils/auth'
import { defineApiHandler } from '../../utils/errors'
import { findUserById } from '../../utils/users'

export default defineApiHandler(async (event) => {
  const { favoris, warningTotal, warningCompte, IDuser, email, username } = await findUserById(requireAuth(event).id)
  return { favoris, warningTotal, warningCompte, IDuser, email, username }
})
