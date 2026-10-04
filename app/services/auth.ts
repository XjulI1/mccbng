import { apiGet, apiPost } from './http'

const COOKIE_TOKEN = 'userToken'
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

export const getTokenCookie = () => readCookie<string>(COOKIE_TOKEN)

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
  writeCookie(COOKIE_TOKEN, userToken)
  writeCookie(COOKIE_USER_ID, userID)
}

export const removeCookies = () => {
  deleteCookie(COOKIE_TOKEN)
  deleteCookie(COOKIE_USER_ID)
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
