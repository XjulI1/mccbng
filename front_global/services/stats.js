import axios from 'axios'

export const fetchEvolutionSolde = (userID, userToken, APIURL) => {
  return axios.get(APIURL + '/api/stats/evolutionSolde', {
    params: {
      access_token: userToken,
      userID
    }
  }).then((response) => {
    return response.data
  })
}

export default {
  fetchEvolutionSolde
}
