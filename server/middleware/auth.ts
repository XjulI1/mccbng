import { defineEventHandler, getRequestHeader, getRequestHost, getRequestURL, type H3Event } from 'h3'
import { authenticate } from '../utils/auth'
import { errorResponse, forbidden } from '../utils/errors'

// Routes publiques de l'API (tout le reste sous /api exige le cookie de session mccbngAuth valide).
const PUBLIC_ROUTES = new Set(['GET /api/ping', 'POST /api/users/login'])
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const CSRF_HEADER = 'x-requested-with'
const CSRF_HEADER_VALUE = 'mccbng'

// Origine attendue : l'hôte servi (Host, ou X-Forwarded-Host derrière le proxy). Le schéma n'est pas comparé :
// le TLS est terminé par le reverse proxy, le serveur voit du HTTP.
const isSameOrigin = (event: H3Event, origin: string) => {
  let host: string
  try {
    host = new URL(origin).host
  } catch {
    return false
  }
  return host === getRequestHost(event) || host === getRequestHost(event, { xForwardedHost: true })
}

// Protection CSRF (en plus de SameSite=Strict) : un formulaire ou un fetch cross-site ne peut pas poser cet en-tête
// sans pré-requête CORS, refusée faute d'en-têtes CORS.
const assertCsrf = (event: H3Event) => {
  if (!UNSAFE_METHODS.has(event.method)) return
  if (getRequestHeader(event, CSRF_HEADER) !== CSRF_HEADER_VALUE) throw forbidden('Missing or invalid X-Requested-With header')
  const origin = getRequestHeader(event, 'origin')
  if (origin && !isSameOrigin(event, origin)) throw forbidden('Cross-origin request refused')
}

export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event)
  if (!pathname.startsWith('/api/')) return
  try {
    assertCsrf(event)
    if (PUBLIC_ROUTES.has(`${event.method} ${pathname.replace(/\/$/, '')}`)) return
    await authenticate(event)
  } catch (error) {
    // Retourner un corps termine la requête (middleware Nitro)
    return errorResponse(event, error)
  }
})
