import { requireAuth } from '../../utils/auth'
import { defineApiHandler } from '../../utils/errors'

export default defineApiHandler(event => Boolean(requireAuth(event).id))
