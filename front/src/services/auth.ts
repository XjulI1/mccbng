import axios from 'axios'
import Cookies from 'universal-cookie'

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

export const auth = (email: string, code: string, apiUrl: string) => {
  return axios
    .post(apiUrl + '/api/users/login', {
      email,
      code
    })
    .then((response) => {
      if (response.status === 200) {
        return {
          userToken: response.data.id,
          ttl: response.data.ttl,
          userID: response.data.userId
        }
      }
      throw new Error('Authentication failed')
    })
    .catch((error) => {
      throw new Error(error)
    })
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

export const checkUserAuthentification = ({ userToken, apiUrl }) => {
  return axios
    .get(apiUrl + '/api/users/exists', {
      headers: {
        Authorization: 'Bearer ' + userToken
      }
    })
    .then(() => {
      return true
    })
    .catch(() => {
      removeCookies()

      return false
    })
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
