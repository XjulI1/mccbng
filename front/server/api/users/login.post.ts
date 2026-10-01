import { z } from 'zod'
import { signToken, setAuthCookie } from '../../utils/auth'
import { defineApiHandler } from '../../utils/errors'
import { parseBody } from '../../utils/validate'
import { verifyCredentials } from '../../utils/users'

const credentials = z.object({ email: z.string().email().max(254), code: z.string().length(6) })

export default defineApiHandler(async (event) => {
  const body = await parseBody(event, credentials)
  const user = await verifyCredentials(body)
  const token = signToken({ id: user.id, name: user.username ?? undefined, email: user.email, IDuser: user.IDuser as number })
  setAuthCookie(event, token)
  return { id: token, userId: user.IDuser }
})
