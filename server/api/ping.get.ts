import { getRequestURL } from 'h3'
import { defineApiHandler } from '../utils/errors'

// Santé : même forme que l'ancien PingController (les en-têtes sensibles ne sont pas renvoyés).
export default defineApiHandler((event) => {
  const { authorization: _a, cookie: _c, ...headers } = event.headers ? Object.fromEntries(event.headers.entries()) : {} as Record<string, string>
  const { pathname, search } = getRequestURL(event)
  return {
    greeting: 'Hello from Nuxt',
    date: new Date(),
    url: pathname + search,
    headers
  }
})
