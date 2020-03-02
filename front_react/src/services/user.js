import axios from 'axios'

export const fetchUser = (userID, userToken) => {
  return axios.get(process.env.REACT_APP_API_URL + '/api/users/' + userID, {
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
