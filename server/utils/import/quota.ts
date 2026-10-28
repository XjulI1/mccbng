import { tooManyRequests } from '../errors'

export const QUOTA_EXTRACTIONS = 30
const FENETRE_MS = 60 * 60 * 1000

// Plafond de coût : extractions par utilisateur sur une heure glissante. Compteur en mémoire (une seule instance).
const appels = new Map<number, number[]>()

export const consumeQuota = (userId: number, now = Date.now()) => {
  const recents = (appels.get(userId) ?? []).filter(t => now - t < FENETRE_MS)
  if (recents.length >= QUOTA_EXTRACTIONS) {
    appels.set(userId, recents)
    throw tooManyRequests('Trop d\'imports sur la dernière heure, réessayez plus tard')
  }
  recents.push(now)
  appels.set(userId, recents)
}
