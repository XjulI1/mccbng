import axios from 'axios'

export const fetchAccountList = (userID, userToken, APIURL) => {
  const filter = { where: { IDuser: userID, visible: true }, order: 'NomCompte ASC' }

  return axios.get(APIURL + '/api/Comptes', {
    params: {
      access_token: userToken,
      filter
    }
  }).then((response) => {
    return response.data
  })
}

export const sumAllCompteForUser = (userID, userToken, APIURL) => {
  return axios.get(APIURL + '/api/Operations/sumAllCompteForUser', {
    params: {
      access_token: userToken,
      userID
    }
  }).then((response) => {
    return response.data.results
  })
}

export const sumForACompte = (userToken, IDcompte, APIURL) => {
  return axios.get(APIURL + '/api/Operations/sumForACompte', {
    params: {
      access_token: userToken,
      id: IDcompte
    }
  }).then((response) => {
    return response.data.results
  })
}

export default {
  fetchAccountList,
  sumAllCompteForUser,
  sumForACompte
}
