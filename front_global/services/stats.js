import axios from 'axios'

export const fetchEvolutionSolde = (userID, userToken, APIURL) => {
  return axios.get(APIURL + '/api/stats/evolutionSolde/' + userID, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  }).then((response) => {
    return response.data
  })
}

export default {
  fetchEvolutionSolde
}
