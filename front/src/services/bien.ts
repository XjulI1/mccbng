import axios from 'axios'

export const fetchBiens = (userToken, APIURL) => {
  return axios
    .get(APIURL + '/api/biens', {
      headers: {
        Authorization: 'Bearer ' + userToken
      }
    })
    .then((response) => {
      return response.data
    })
}

export const fetchBienById = (IDbien, userToken, APIURL) => {
  return axios
    .get(APIURL + '/api/biens/' + IDbien, {
      headers: {
        Authorization: 'Bearer ' + userToken
      }
    })
    .then((response) => {
      return response.data
    })
}

export const updateBien = (bien, userToken, APIURL) => {
  if (bien.IDbien) {
    return axios.put(
      APIURL + '/api/biens/' + bien.IDbien,
      { ...bien, IDbien: undefined },
      {
        headers: {
          Authorization: 'Bearer ' + userToken
        }
      }
    )
  } else {
    return axios.post(
      APIURL + '/api/biens/',
      bien,
      {
        headers: {
          Authorization: 'Bearer ' + userToken
        }
      }
    )
  }
}

export const deleteBien = (IDbien, userToken, APIURL) => {
  return axios.delete(APIURL + '/api/biens/' + IDbien, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  })
}
