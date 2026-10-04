import { apiDelete, apiGet, apiPost, apiPut } from './http'

export const fetchCredits = (userToken, APIURL) =>
  apiGet(APIURL + '/api/credits', { token: userToken })

export const fetchCreditById = (IDcredit, userToken, APIURL) =>
  apiGet(APIURL + '/api/credits/' + IDcredit, { token: userToken })

export const updateCredit = (credit, userToken, APIURL) => {
  if (credit.IDcredit) {
    return apiPut(
      APIURL + '/api/credits/' + credit.IDcredit,
      { ...credit, IDcredit: undefined },
      { token: userToken }
    )
  }

  return apiPost(APIURL + '/api/credits/', credit, { token: userToken })
}

export const deleteCredit = (IDcredit, userToken, APIURL) =>
  apiDelete(APIURL + '/api/credits/' + IDcredit, { token: userToken })

export const fetchCreditRemainingBalance = (IDcredit, userToken, APIURL) =>
  apiGet(APIURL + '/api/credits/' + IDcredit + '/remaining-balance', {
    token: userToken
  })

export const fetchCreditPayments = (IDcredit, userToken, APIURL) =>
  apiGet(APIURL + '/api/credits/' + IDcredit + '/payments', {
    token: userToken
  })
