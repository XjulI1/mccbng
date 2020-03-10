import axios from 'axios'

export const fetchAccountList = (userID, userToken, api_url) => {
  const filter = { where: { IDuser: userID, visible: true }, order: 'NomCompte ASC' }

  return axios.get(api_url + '/api/Comptes', {
    params: {
      access_token: userToken,
      filter
    }
  }).then((response) => {
    return response.data
  })
}

export const sumAllCompteForUser = (userID, userToken, api_url) => {
  return axios.get(api_url + '/api/Operations/sumAllCompteForUser', {
    params: {
      access_token: userToken,
      userID
    }
  }).then((response) => {
    return response.data.results
  })
}

export default {
  fetchAccountList
}
