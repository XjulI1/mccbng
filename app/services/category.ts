import { apiGet } from './http'

export const fetchCategoryList = (IDuser, userToken, APIURL) => {
  const filter = {
    where: { or: [{ IDuser }, { IDuser: 0 }] },
    order: 'Nom ASC'
  }

  return apiGet(APIURL + '/api/categories', {
    token: userToken,
    params: { filter }
  })
}

export default {
  fetchCategoryList
}
