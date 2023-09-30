import axios from 'axios'

export const fetchUser = (_, userToken, apiUrl) => {
  return axios.get(apiUrl + '/api/users/whoAmI', {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  }).then((response) => {
    return { id: response.data.IDuser, favoris: response.data.favoris, warningTotal: response.data.warningTotal }
  }).catch((error) => {
    throw new Error(error)
  })
}

export default {
  fetchUser
}
