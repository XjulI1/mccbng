import { apiGet, apiPatch } from './http'

export const fetchUser = async (_, userToken, apiUrl) => {
  const data = await apiGet<{
    IDuser: number
    favoris: unknown
    warningTotal: unknown
    warningCompte: unknown
    email: string
    username: string
  }>(apiUrl + '/api/users/whoAmI', { token: userToken })

  return {
    id: data.IDuser,
    favoris: data.favoris,
    warningTotal: data.warningTotal,
    warningCompte: data.warningCompte,
    email: data.email,
    username: data.username
  }
}

export const updateUser = (updates, userToken, apiUrl) =>
  apiPatch(apiUrl + '/api/users/me', updates, { token: userToken })

export default {
  fetchUser,
  updateUser
}
