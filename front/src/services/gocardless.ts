import axios from 'axios'

export const getConfigStatus = (userToken, APIURL) => {
  return axios
    .get(APIURL + '/api/gocardless/config/status', {
      headers: {
        Authorization: 'Bearer ' + userToken
      }
    })
    .then((response) => response.data)
}

export const getInstitutions = (userToken, APIURL, country = 'fr') => {
  return axios
    .get(APIURL + '/api/gocardless/institutions', {
      headers: {
        Authorization: 'Bearer ' + userToken
      },
      params: { country }
    })
    .then((response) => response.data)
}

export const createRequisition = (institutionId, redirectUrl, userToken, APIURL) => {
  return axios
    .post(
      APIURL + '/api/gocardless/requisitions',
      { institutionId, redirectUrl },
      {
        headers: {
          Authorization: 'Bearer ' + userToken
        }
      }
    )
    .then((response) => response.data)
}

export const listRequisitions = (userToken, APIURL) => {
  return axios
    .get(APIURL + '/api/gocardless/requisitions', {
      headers: {
        Authorization: 'Bearer ' + userToken
      }
    })
    .then((response) => response.data)
}

export const getRequisitionStatus = (requisitionId, userToken, APIURL) => {
  return axios
    .get(APIURL + '/api/gocardless/requisitions/' + requisitionId + '/status', {
      headers: {
        Authorization: 'Bearer ' + userToken
      }
    })
    .then((response) => response.data)
}

export const deleteRequisition = (requisitionId, userToken, APIURL) => {
  return axios.delete(APIURL + '/api/gocardless/requisitions/' + requisitionId, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  })
}

export const linkAccount = (accountId, IDcompte, requisitionId, iban, institutionId, userToken, APIURL) => {
  return axios
    .post(
      APIURL + '/api/gocardless/accounts/link',
      { accountId, IDcompte, requisitionId, iban, institutionId },
      {
        headers: {
          Authorization: 'Bearer ' + userToken
        }
      }
    )
    .then((response) => response.data)
}

export const listLinkedAccounts = (userToken, APIURL) => {
  return axios
    .get(APIURL + '/api/gocardless/accounts', {
      headers: {
        Authorization: 'Bearer ' + userToken
      }
    })
    .then((response) => response.data)
}

export const unlinkAccount = (id, userToken, APIURL) => {
  return axios.delete(APIURL + '/api/gocardless/accounts/' + id, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  })
}

export const syncTransactions = (IDcompte, userToken, APIURL) => {
  return axios
    .post(
      APIURL + '/api/gocardless/sync/' + IDcompte,
      {},
      {
        headers: {
          Authorization: 'Bearer ' + userToken
        }
      }
    )
    .then((response) => response.data)
}

export default {
  getConfigStatus,
  getInstitutions,
  createRequisition,
  listRequisitions,
  getRequisitionStatus,
  deleteRequisition,
  linkAccount,
  listLinkedAccounts,
  unlinkAccount,
  syncTransactions
}
