import { apiGet, apiPost } from './http'

export const fetchBanques = (userToken, APIURL) => {
  const filter = { order: 'NomBanque ASC' }

  return apiGet(APIURL + '/api/banques', {
    token: userToken,
    params: { filter }
  })
}

export const createBanque = (banque, userToken, APIURL) =>
  apiPost(APIURL + '/api/banques', banque, { token: userToken })

export default {
  fetchBanques,
  createBanque
}
