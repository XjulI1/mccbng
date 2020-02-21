import axios from 'axios'
import config from '../config'

export const fetchUser = (userID, userToken) => {
  return axios.get(config().API_URL + '/api/users/' + userID, {
    params: {
      access_token: userToken
    }
  }).then((response) => {
    return { id: response.data.id, favoris: response.data.favoris, warningTotal: response.data.warningTotal }
  }).catch((error) => {
    throw new Error(error)
  })
}

export default {
  fetchUser
}
