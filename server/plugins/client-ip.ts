import { defineNitroPlugin } from 'nitropack/runtime'
import { getRequestIP, type H3Event } from 'h3'
import { TRUSTED_IP_HEADER } from '../utils/client-ip'

// Le rate-limit de nuxt-security lit l'IP dans `ipHeader` sans repli : sans l'en-tête, tous les clients partageraient
// le même compteur. Le hook `request` s'exécute avant tout middleware : on y pose l'adresse de la socket si le proxy
// n'a pas fourni l'en-tête.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event: H3Event) => {
    const headers = event.node?.req.headers
    if (headers && !headers[TRUSTED_IP_HEADER]) headers[TRUSTED_IP_HEADER] = getRequestIP(event) || 'unknown'
  })
})
