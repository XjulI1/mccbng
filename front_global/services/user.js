import axios from 'axios'

export const fetchUser = (userID, userToken, api_url) => {
  return axios.get(api_url + '/api/users/' + userID, {
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
