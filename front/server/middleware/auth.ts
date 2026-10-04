import { defineEventHandler, getRequestURL } from 'h3'
import { requireAuth } from '../utils/auth'
import { errorResponse } from '../utils/errors'

// Routes publiques de l'API (tout le reste sous /api exige un Bearer JWT valide).
const PUBLIC_ROUTES = new Set(['GET /api/ping', 'POST /api/users/login'])

export default defineEventHandler((event) => {
  const { pathname } = getRequestURL(event)
  if (!pathname.startsWith('/api/')) return
  if (PUBLIC_ROUTES.has(`${event.method} ${pathname.replace(/\/$/, '')}`)) return
  try {
    requireAuth(event)
  } catch (error) {
    // Retourner un corps termine la requête (middleware Nitro)
    return errorResponse(event, error)
  }
})
