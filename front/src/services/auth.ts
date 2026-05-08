import Cookies from 'universal-cookie'

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

export const getTokenCookie = () => {
  const cookie = new Cookies()

  return cookie.get(COOKIE_TOKEN)
}

export const getUserIDCookie = () => {
  const cookie = new Cookies()

  return cookie.get(COOKIE_USER_ID)
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
  const cookie = new Cookies()
  const opts = cookieOptions()

  cookie.set(COOKIE_TOKEN, userToken, opts)
  cookie.set(COOKIE_USER_ID, userID, opts)
}

export const removeCookies = () => {
  const cookie = new Cookies()
  const opts = { path: '/' }
  cookie.remove(COOKIE_TOKEN, opts)
  cookie.remove(COOKIE_USER_ID, opts)
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
