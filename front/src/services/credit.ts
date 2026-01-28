import axios from 'axios'

export const fetchCredits = (userToken, APIURL) => {
  return axios
    .get(APIURL + '/api/credits', {
      headers: {
        Authorization: 'Bearer ' + userToken
      }
    })
    .then((response) => {
      return response.data
    })
}

export const fetchCreditById = (IDcredit, userToken, APIURL) => {
  return axios
    .get(APIURL + '/api/credits/' + IDcredit, {
      headers: {
        Authorization: 'Bearer ' + userToken
      }
    })
    .then((response) => {
      return response.data
    })
}

export const updateCredit = (credit, userToken, APIURL) => {
  if (credit.IDcredit) {
    return axios.put(
      APIURL + '/api/credits/' + credit.IDcredit,
      { ...credit, IDcredit: undefined },
      {
        headers: {
          Authorization: 'Bearer ' + userToken
        }
      }
    )
  } else {
    return axios.post(
      APIURL + '/api/credits/',
      credit,
      {
        headers: {
          Authorization: 'Bearer ' + userToken
        }
      }
    )
  }
}

export const deleteCredit = (IDcredit, userToken, APIURL) => {
  return axios.delete(APIURL + '/api/credits/' + IDcredit, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  })
}

export const fetchCreditRemainingBalance = (IDcredit, userToken, APIURL) => {
  return axios
    .get(APIURL + '/api/credits/' + IDcredit + '/remaining-balance', {
      headers: {
        Authorization: 'Bearer ' + userToken
      }
    })
    .then((response) => {
      return response.data
    })
}

export const fetchCreditPayments = (IDcredit, userToken, APIURL) => {
  return axios
    .get(APIURL + '/api/credits/' + IDcredit + '/payments', {
      headers: {
        Authorization: 'Bearer ' + userToken
      }
    })
    .then((response) => {
      return response.data
    })
}
