import { getRequestHeader } from 'h3'
import { z } from 'zod'
import { signToken, setAuthCookie } from '../../utils/auth'
import { getTrustedIp } from '../../utils/client-ip'
import { defineApiHandler } from '../../utils/errors'
import { parseBody } from '../../utils/validate'
import { verifyCredentials } from '../../utils/users'

const credentials = z.object({ email: z.string().email().max(254), code: z.string().length(6) })

// Le JWT n'est porté que par le cookie HttpOnly : il n'est jamais renvoyé dans le corps.
export default defineApiHandler(async (event) => {
  const body = await parseBody(event, credentials)
  const user = await verifyCredentials(body, { ip: getTrustedIp(event), userAgent: getRequestHeader(event, 'user-agent') })
  const token = signToken({ name: user.username ?? undefined, email: user.email, IDuser: user.IDuser, tv: user.tokenVersion })
  setAuthCookie(event, token)
  return { userId: user.IDuser }
})
