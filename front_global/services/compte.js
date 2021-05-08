import axios from "axios"

export const fetchAccountList = (userID, userToken, APIURL) => {
  const filter = { include: [{ relation: "Banque" }], where: { IDuser: userID }, order: "NomCompte ASC" }

  return axios.get(APIURL + "/api/comptes", {
    params: {
      access_token: userToken,
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
  return axios.get(APIURL + "/api/Operations/sumAllCompteForUser", {
    params: {
      access_token: userToken,
      userID
    }
  }).then((response) => {
    return response.data.results
  })
}

export const sumForACompte = (userToken, IDcompte, APIURL) => {
  return axios.get(APIURL + "/api/Operations/sumForACompte", {
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
