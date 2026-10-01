import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { API_URL } from '@/services/config'
import { checkUserAuthentification, getTokenCookie, getUserIDCookie } from '@/services/auth'
import { useCompteStore } from '@/stores/compte'
import { useUserStore } from '@/stores/user'

// Redirige vers /login tant que la session (cookies userToken / userID) n'est pas valide.
// Au premier chargement, une session valide est réhydratée dans le store puis la
// navigation demandée (lien profond compris) est conservée.
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const userStore = useUserStore()
  if (userStore.token) return

  const userToken = getTokenCookie()
  const userID = getUserIDCookie()
  if (!userToken || !userID) {
    return navigateTo('/login')
  }

  // checkUserAuthentification supprime les cookies si le token est invalide
  const isValid = await checkUserAuthentification({ userToken, apiUrl: API_URL })
  if (!isValid) {
    return navigateTo('/login')
  }

  userStore.saveUserToken(userToken)
  useCompteStore().fetchUserByIDAndGenerateRecurringOp(userID)
})
