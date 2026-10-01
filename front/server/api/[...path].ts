import { defineEventHandler, getRequestURL, proxyRequest } from 'h3'

// Proxy /api/** vers le back LoopBack. API_URL est lu à l'exécution (pas au build).
// Ce handler disparaîtra quand l'API sera migrée dans ./server.
export default defineEventHandler((event) => {
  const target = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '')
  const { pathname, search } = getRequestURL(event)
  return proxyRequest(event, `${target}${pathname}${search}`)
})
