import { apiDelete, apiGet, apiPatch, apiPost } from './http'

export const fetchAccountList = async (userID, userToken, APIURL) => {
  const filter = {
    include: [{ relation: 'banque' }],
    where: { IDuser: userID },
    order: 'NomCompte ASC'
  }

  const data = await apiGet<any[]>(APIURL + '/api/comptes', {
    token: userToken,
    params: { filter }
  })

  return data.map((account) => ({
    ...account,
    soldeNotChecked: 0,
    soldeChecked: 0
  }))
}

export const sumAllCompteForUser = (userToken, APIURL) =>
  apiGet(APIURL + '/api/operations/sumAllCompteForUser', { token: userToken })

export const sumForACompte = (userToken, IDcompte, APIURL) =>
  apiGet(APIURL + '/api/operations/sumForACompte', {
    token: userToken,
    params: { id: IDcompte }
  })

export const createCompte = (compte, userToken, APIURL) =>
  apiPost(APIURL + '/api/comptes', compte, { token: userToken })

export const updateCompte = (IDcompte, compte, userToken, APIURL) =>
  apiPatch(APIURL + '/api/comptes/' + IDcompte, compte, { token: userToken })

export const deleteCompte = (IDcompte, userToken, APIURL) =>
  apiDelete(APIURL + '/api/comptes/' + IDcompte, { token: userToken })

export const fetchComptesManagementInfo = (userToken, APIURL) =>
  apiGet(APIURL + '/api/comptes/management-info', { token: userToken })

export default {
  fetchAccountList,
  sumAllCompteForUser,
  sumForACompte,
  createCompte,
  updateCompte,
  deleteCompte,
  fetchComptesManagementInfo
}
