import axios from 'axios'
import Cookies from 'universal-cookie'

const COOKIE_TOKEN = 'userToken'
const COOKIE_USER_ID = 'userID'

export const getTokenCookie = () => {
  const cookie = new Cookies()

  return cookie.get(COOKIE_TOKEN)
}

export const getUserIDCookie = () => {
  const cookie = new Cookies()

  return cookie.get(COOKIE_USER_ID)
}

export const auth = (value, apiUrl) => {
  return axios
    .post(apiUrl + '/api/users/login', {
      code: value
    })
    .then((response) => {
      if (response.status === 200) {
        return {
          userToken: response.data.id,
          ttl: response.data.ttl,
          userID: response.data.userId
        }
      }
    })
    .catch((error) => {
      throw new Error(error)
    })
}

export const saveCookies = ({ userToken, userID, ttl }) => {
  const cookie = new Cookies()

  cookie.set(COOKIE_TOKEN, userToken)
  cookie.set(COOKIE_USER_ID, userID)
}

export const removeCookies = () => {
  const cookie = new Cookies()
  cookie.remove(COOKIE_TOKEN)
  cookie.remove(COOKIE_USER_ID)
}

export const checkUserAuthentification = ({ userToken, _, apiUrl }) => {
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
      saveCookies({ userToken: undefined, userID: undefined, ttl: 0 })

      return false
    })
}

export default {
  getTokenCookie,
  getUserIDCookie,
  auth,
  saveCookies,
  checkUserAuthentification
}
