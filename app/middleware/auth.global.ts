import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { API_URL } from '@/services/config'
import { checkUserAuthentification, getUserIDCookie, removeCookies, removeLegacyTokenCookie } from '@/services/auth'
import { hydrateSession } from '@/services/session'
import { useUserStore } from '@/stores/user'

// Redirige vers /login tant que la session n'est pas valide. Le jeton est dans le cookie HttpOnly mccbngAuth
// (illisible en JS) : sa validité est vérifiée par le serveur via GET /api/users/exists.
// Au premier chargement, une session valide est réhydratée dans le store (utilisateur,
// comptes, catégories) avant que la navigation demandée (lien profond compris) ne se fasse.
export default defineNuxtRouteMiddleware(async (to) => {
  const userStore = useUserStore()
  if (userStore.token) {
    // Déjà authentifié : /login n'a plus d'intérêt
    return to.path === '/login' ? navigateTo('/') : undefined
  }

  // Ancien cookie lisible en JS qui portait le JWT : supprimé au démarrage
  removeLegacyTokenCookie()

  const userID = getUserIDCookie()
  if (!userID) {
    return to.path === '/login' ? undefined : navigateTo('/login')
  }

  // checkUserAuthentification supprime les cookies si la session est invalide
  const isValid = await checkUserAuthentification({ apiUrl: API_URL })
  if (!isValid) {
    return to.path === '/login' ? undefined : navigateTo('/login')
  }

  try {
    await hydrateSession(userID)
  } catch {
    userStore.closeSession()
    removeCookies()
    return to.path === '/login' ? undefined : navigateTo('/login')
  }

  if (to.path === '/login') return navigateTo('/')
})
