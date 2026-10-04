import { setResponseStatus } from 'h3'
import { clearAuthCookie } from '../../utils/auth'
import { defineApiHandler } from '../../utils/errors'

export default defineApiHandler((event) => {
  clearAuthCookie(event)
  setResponseStatus(event, 204)
  return null
})
