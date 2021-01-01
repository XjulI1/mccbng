import axios from 'axios'

export const fetchEvolutionSolde = (userID, userToken, APIURL) => {
  return axios.get(APIURL + '/api/stats/evolutionSolde/' + userID, {
    params: {
      access_token: userToken
    }
  }).then((response) => {
    return response.data
  })
}

export default {
  fetchEvolutionSolde
}
