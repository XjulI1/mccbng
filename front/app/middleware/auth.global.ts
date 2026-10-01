import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { API_URL } from '@/services/config'
import { checkUserAuthentification, getTokenCookie, getUserIDCookie, removeCookies } from '@/services/auth'
import { hydrateSession } from '@/services/session'
import { useUserStore } from '@/stores/user'

// Redirige vers /login tant que la session (cookies userToken / userID) n'est pas valide.
// Au premier chargement, une session valide est réhydratée dans le store (utilisateur,
// comptes, catégories) avant que la navigation demandée (lien profond compris) ne se fasse.
export default defineNuxtRouteMiddleware(async (to) => {
  const userStore = useUserStore()
  if (userStore.token) {
    // Déjà authentifié : /login n'a plus d'intérêt
    return to.path === '/login' ? navigateTo('/') : undefined
  }

  const userToken = getTokenCookie()
  const userID = getUserIDCookie()
  if (!userToken || !userID) {
    return to.path === '/login' ? undefined : navigateTo('/login')
  }

  // checkUserAuthentification supprime les cookies si le token est invalide
  const isValid = await checkUserAuthentification({ userToken, apiUrl: API_URL })
  if (!isValid) {
    return to.path === '/login' ? undefined : navigateTo('/login')
  }

  try {
    await hydrateSession(userToken, userID)
  } catch {
    userStore.saveUserToken(null)
    removeCookies()
    return to.path === '/login' ? undefined : navigateTo('/login')
  }

  if (to.path === '/login') return navigateTo('/')
})
