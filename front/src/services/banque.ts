import axios from 'axios'

export const fetchBanques = (userToken, APIURL) => {
  const filter = { order: 'NomBanque ASC' }

  return axios.get(APIURL + '/api/banques', {
    headers: {
      Authorization: 'Bearer ' + userToken
    },
    params: {
      filter
    }
  }).then((response) => {
    return response.data
  })
}

export const createBanque = (banque, userToken, APIURL) => {
  return axios.post(APIURL + '/api/banques', banque, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  }).then((response) => {
    return response.data
  })
}

export default {
  fetchBanques,
  createBanque
}
