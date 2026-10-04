import { defineNitroPlugin } from 'nitropack/runtime'
import { getConfig, hasEphemeralJwtSecret } from '../utils/config'

// Échoue au démarrage (et non à la première requête) si la configuration est incomplète.
// Ignoré pendant le prérendu du build : l'image est construite sans configuration DB.
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return
  if (process.env.NODE_ENV === 'production') getConfig()
  else console.info('[config] mode développement : la configuration DB_* est vérifiée à la première requête SQL')
  if (hasEphemeralJwtSecret()) {
    console.warn('[config] JWT_SECRET absent : secret éphémère, les sessions seront invalidées à chaque redémarrage')
  }
})
