import { defineNitroPlugin } from 'nitropack/runtime'
import { getRequestIP, type H3Event } from 'h3'
import { rateLimitKey, TRUSTED_IP_HEADER } from '../utils/client-ip'

// Le rate-limit de nuxt-security lit l'IP dans `ipHeader` sans repli ni normalisation. Le hook `request` s'exécute
// avant tout middleware : on y conserve l'IP complète du client (journal) et on remplace l'en-tête par la clé de
// rate-limit (IPv6 réduite à son /64), en se repliant sur l'adresse de la socket si le proxy n'a rien fourni.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event: H3Event) => {
    const headers = event.node?.req.headers
    if (!headers) return
    const provided = headers[TRUSTED_IP_HEADER]
    const ip = (Array.isArray(provided) ? provided[0] : provided) || getRequestIP(event) || 'unknown'
    event.context.clientIp = ip
    headers[TRUSTED_IP_HEADER] = rateLimitKey(ip)
  })
})
