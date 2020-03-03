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

export const auth = (value) => {
  return axios.post(process.env.REACT_APP_API_URL + '/api/users/login', {
    code: value
  }).then((response) => {
    if (response.status === 200) {
      return {
        userToken: response.data.id,
        ttl: response.data.ttl,
        userID: response.data.userId
      }
    }
  }).catch((error) => {
    throw new Error(error)
  })
}

export const saveCookies = ({ userToken, userID, ttl }) => {
  const cookie = new Cookies()

  cookie.set(COOKIE_TOKEN, userToken, { maxAge: ttl })
  cookie.set(COOKIE_USER_ID, userID, { maxAge: ttl })
}

export const checkUserAuthentification = ({ userToken, userID }) => {
  return axios.get(process.env.REACT_APP_API_URL + '/api/users/' + userID + '/exists', {
    params: {
      access_token: userToken
    }
  }).then(() => {
    return true
  }).catch(() => {
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
