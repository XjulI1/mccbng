import axios from 'axios'

export const fetchAccountList = (userID, userToken, APIURL) => {
  const filter = { include: [{ relation: 'banque' }], where: { IDuser: userID }, order: 'NomCompte ASC' }

  return axios.get(APIURL + '/api/comptes', {
    headers: {
      Authorization: 'Bearer ' + userToken
    },
    params: {
      filter
    }
  }).then((response) => {
    return response.data.map((account) => {
      return {
        ...account,
        soldeNotChecked: 0,
        soldeChecked: 0
      }
    })
  })
}

export const sumAllCompteForUser = (userToken, APIURL) => {
  return axios.get(APIURL + '/api/operations/sumAllCompteForUser', {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  }).then((response) => {
    return response.data
  })
}

export const sumForACompte = (userToken, IDcompte, APIURL) => {
  return axios.get(APIURL + '/api/operations/sumForACompte', {
    headers: {
      Authorization: 'Bearer ' + userToken
    },
    params: {
      id: IDcompte
    }
  }).then((response) => {
    return response.data
  })
}

export const createCompte = (compte, userToken, APIURL) => {
  return axios.post(APIURL + '/api/comptes', compte, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  }).then((response) => {
    return response.data
  })
}

export const updateCompte = (IDcompte, compte, userToken, APIURL) => {
  return axios.patch(APIURL + '/api/comptes/' + IDcompte, compte, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  }).then((response) => {
    return response.data
  })
}

export const deleteCompte = (IDcompte, userToken, APIURL) => {
  return axios.delete(APIURL + '/api/comptes/' + IDcompte, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  }).then((response) => {
    return response.data
  })
}

export const fetchComptesManagementInfo = (userToken, APIURL) => {
  return axios.get(APIURL + '/api/comptes/management-info', {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  }).then((response) => {
    return response.data
  })
}

export default {
  fetchAccountList,
  sumAllCompteForUser,
  sumForACompte,
  createCompte,
  updateCompte,
  deleteCompte,
  fetchComptesManagementInfo
}
