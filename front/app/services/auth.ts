import { useCookie } from '#imports'

import { apiGet, apiPost } from './http'

const COOKIE_TOKEN = 'userToken'
const COOKIE_USER_ID = 'userID'
const LOCAL_STORAGE_EMAIL = 'mccbng.lastEmail'

const isHttps = (): boolean =>
  typeof window !== 'undefined' && window.location?.protocol === 'https:'

const cookieOptions = () => ({
  path: '/',
  sameSite: 'strict' as const,
  secure: isHttps()
})

// useCookie est appelé à chaque lecture/écriture : en SPA, l'instance Nuxt est globale côté client,
// ces fonctions restent donc utilisables hors setup (handlers, callbacks asynchrones).
export const getTokenCookie = () => {
  return useCookie<string | null>(COOKIE_TOKEN, { path: '/' }).value
}

export const getUserIDCookie = () => {
  return useCookie<string | number | null>(COOKIE_USER_ID, { path: '/' }).value
}

export const getLastEmail = (): string => {
  try {
    return window.localStorage.getItem(LOCAL_STORAGE_EMAIL) ?? ''
  } catch {
    return ''
  }
}

export const setLastEmail = (email: string) => {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_EMAIL, email)
  } catch {
    // localStorage unavailable (private mode, etc.) — ignore.
  }
}

export const clearLastEmail = () => {
  try {
    window.localStorage.removeItem(LOCAL_STORAGE_EMAIL)
  } catch {
    // ignore
  }
}

export const auth = async (email: string, code: string, apiUrl: string) => {
  const data = await apiPost<{ id: string; ttl: number; userId: number }>(
    apiUrl + '/api/users/login',
    { email, code }
  )

  return {
    userToken: data.id,
    ttl: data.ttl,
    userID: data.userId
  }
}

export const saveCookies = ({ userToken, userID }) => {
  const opts = cookieOptions()

  useCookie(COOKIE_TOKEN, opts).value = userToken
  useCookie(COOKIE_USER_ID, opts).value = userID
}

export const removeCookies = () => {
  const opts = { path: '/' }

  useCookie(COOKIE_TOKEN, opts).value = null
  useCookie(COOKIE_USER_ID, opts).value = null
}

export const checkUserAuthentification = async ({ userToken, apiUrl }) => {
  try {
    await apiGet(apiUrl + '/api/users/exists', { token: userToken })

    return true
  } catch {
    removeCookies()

    return false
  }
}

export default {
  getTokenCookie,
  getUserIDCookie,
  getLastEmail,
  setLastEmail,
  clearLastEmail,
  auth,
  saveCookies,
  removeCookies,
  checkUserAuthentification
}
