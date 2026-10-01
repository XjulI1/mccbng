import { apiDelete, apiGet, apiPost, apiPut } from './http'

export const fetchBiens = (userToken, APIURL) =>
  apiGet(APIURL + '/api/biens', { token: userToken })

export const fetchBienById = (IDbien, userToken, APIURL) =>
  apiGet(APIURL + '/api/biens/' + IDbien, { token: userToken })

export const updateBien = (bien, userToken, APIURL) => {
  if (bien.IDbien) {
    return apiPut(
      APIURL + '/api/biens/' + bien.IDbien,
      { ...bien, IDbien: undefined },
      { token: userToken }
    )
  }

  return apiPost(APIURL + '/api/biens/', bien, { token: userToken })
}

export const deleteBien = (IDbien, userToken, APIURL) =>
  apiDelete(APIURL + '/api/biens/' + IDbien, { token: userToken })
