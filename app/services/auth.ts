import { apiGet, apiPost } from './http'

// Ancien cookie lisible en JS qui portait le JWT : n'est plus écrit, supprimé s'il subsiste.
// La session est portée par le cookie HttpOnly mccbngAuth, posé et lu uniquement par le serveur.
const LEGACY_COOKIE_TOKEN = 'userToken'
const COOKIE_USER_ID = 'userID'
const LOCAL_STORAGE_EMAIL = 'mccbng.lastEmail'

const isHttps = (): boolean =>
  typeof window !== 'undefined' && window.location?.protocol === 'https:'

// Cookies manipulés directement via document.cookie (même format que useCookie : JSON encodé en URI)
// pour éviter de créer un ref + watcher useCookie à chaque appel hors setup.
const readCookie = <T>(name: string): T | null => {
  if (typeof document === 'undefined') return null
  const entry = document.cookie.split('; ').find(c => c.startsWith(name + '='))
  if (!entry) return null
  const raw = decodeURIComponent(entry.slice(name.length + 1))
  try {
    return JSON.parse(raw) as T
  } catch {
    return raw as unknown as T
  }
}

const writeCookie = (name: string, value: unknown) => {
  const secure = isHttps() ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; Path=/; SameSite=Strict${secure}`
}

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Strict`
}

export const getUserIDCookie = () => readCookie<string | number>(COOKIE_USER_ID)

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
  const data = await apiPost<{ userId: number }>(
    apiUrl + '/api/users/login',
    { email, code }
  )

  return { userID: data.userId }
}

export const saveCookies = ({ userID }) => {
  writeCookie(COOKIE_USER_ID, userID)
}

export const removeLegacyTokenCookie = () => {
  if (readCookie(LEGACY_COOKIE_TOKEN) !== null) deleteCookie(LEGACY_COOKIE_TOKEN)
}

export const removeCookies = () => {
  deleteCookie(LEGACY_COOKIE_TOKEN)
  deleteCookie(COOKIE_USER_ID)
}

// La validité de la session (cookie HttpOnly) ne peut être vérifiée que par le serveur.
export const checkUserAuthentification = async ({ apiUrl }) => {
  try {
    await apiGet(apiUrl + '/api/users/exists')

    return true
  } catch {
    removeCookies()

    return false
  }
}

// Révoque la session côté serveur (tous les appareils) ; un échec réseau n'empêche pas la déconnexion locale.
export const logout = async (apiUrl: string) => {
  try {
    await apiPost(apiUrl + '/api/users/logout')
  } catch {
    // déconnexion locale malgré tout
  }
  removeCookies()
}

export default {
  getUserIDCookie,
  getLastEmail,
  setLastEmail,
  clearLastEmail,
  auth,
  saveCookies,
  removeLegacyTokenCookie,
  removeCookies,
  checkUserAuthentification,
  logout
}
