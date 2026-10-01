import { createError, defineEventHandler, getRequestURL, proxyRequest } from 'h3'

// Proxy /api/** vers le back LoopBack. API_URL est lu à l'exécution (pas au build).
// Ce handler disparaîtra quand l'API sera migrée dans ./server.
export default defineEventHandler(async (event) => {
  const target = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '')
  const { pathname, search } = getRequestURL(event)
  try {
    return await proxyRequest(event, `${target}${pathname}${search}`, {
      // L'API s'authentifie par Authorization: Bearer : les cookies de session n'ont pas à traverser le proxy
      headers: { cookie: '' },
      fetchOptions: { signal: AbortSignal.timeout(30_000) }
    })
  } catch (error) {
    console.error('[api proxy]', pathname, error)
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', data: { error: { message: 'API indisponible' } } })
  }
})
