import axios from 'axios'

export const fetchUser = (_, userToken, apiUrl) => {
  return axios.get(apiUrl + '/api/users/whoAmI', {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  }).then((response) => {
    return {
      id: response.data.IDuser,
      favoris: response.data.favoris,
      warningTotal: response.data.warningTotal,
      warningCompte: response.data.warningCompte,
      email: response.data.email,
      username: response.data.username
    }
  }).catch((error) => {
    throw new Error(error)
  })
}

export const updateUser = (updates, userToken, apiUrl) => {
  return axios.patch(apiUrl + '/api/users/me', updates, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  }).catch((error) => {
    throw new Error(error)
  })
}

export default {
  fetchUser,
  updateUser
}
