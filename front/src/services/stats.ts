import axios from 'axios'

export const fetchEvolutionSolde = (userToken, APIURL) => {
  return axios.get(APIURL + '/api/stats/evolutionSolde', {
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
