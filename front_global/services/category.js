import axios from 'axios'

export const fetchCategoryList = (IDuser, userToken, APIURL) => {
  const filter = { where: { or: [{ IDuser }, { IDuser: 0 }] }, order: 'Nom ASC' }

  return axios.get(APIURL + '/api/Categories', {
    params: {
      access_token: userToken,
      filter
    }
  }).then((response) => {
    return response.data
  })
}

export default {
  fetchCategoryList
}
