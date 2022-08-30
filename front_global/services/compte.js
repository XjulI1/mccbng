import axios from "axios"

export const fetchAccountList = (userID, userToken, APIURL) => {
  const filter = { include: [{ relation: "banque" }], where: { IDuser: userID }, order: "NomCompte ASC" }

  return axios.get(APIURL + "/api/comptes", {
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

export const sumAllCompteForUser = (userID, userToken, APIURL) => {
  return axios.get(APIURL + "/api/operations/sumAllCompteForUser", {
    headers: {
      Authorization: 'Bearer ' + userToken
    },
    params: {
      userID
    }
  }).then((response) => {
    return response.data
  })
}

export const sumForACompte = (userToken, IDcompte, APIURL) => {
  return axios.get(APIURL + "/api/operations/sumForACompte", {
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

export default {
  fetchAccountList,
  sumAllCompteForUser,
  sumForACompte
}
