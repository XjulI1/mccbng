import { defineNitroPlugin } from 'nitropack/runtime'
import { getConfig, hasEphemeralJwtSecret } from '../utils/config'

export default defineNitroPlugin(() => {
  if (import.meta.prerender) return
  if (!import.meta.dev) getConfig()
  else console.info('[config] mode développement : la configuration NUXT_DB_* est vérifiée à la première requête SQL')
  if (hasEphemeralJwtSecret()) {
    console.warn('[config] NUXT_JWT_SECRET absent : secret éphémère, les sessions seront invalidées à chaque redémarrage')
  }
})
