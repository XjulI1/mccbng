import { apiDelete, apiGet, apiPost, apiPut } from './http'

export const fetchOperationsForAccount = (
  IDcompte,
  userToken,
  APIURL,
  skip = 0,
  limit = 35
) => {
  const filter = {
    where: { IDcompte },
    order: 'CheckOp ASC, DateOp DESC',
    limit,
    skip
  }

  return apiGet(APIURL + '/api/operations', {
    token: userToken,
    params: { filter }
  })
}

export const updateOperation = (operation, userToken, APIURL) => {
  if (operation.IDop) {
    return apiPut(
      APIURL + '/api/operations/' + operation.IDop,
      { ...operation, IDop: undefined },
      { token: userToken }
    )
  }

  return apiPost(
    APIURL + '/api/operations/',
    { ...operation, IDcompteCredit: undefined, IDcompteDebit: undefined },
    { token: userToken }
  )
}

export const deleteOperation = (IDoperation, userToken, APIURL) =>
  apiDelete(APIURL + '/api/operations/' + IDoperation, { token: userToken })

export const fetchSearchOperations = (
  searchTerms,
  accountList,
  userToken,
  APIURL,
  skip = 0,
  limit = 35
) => {
  const filter = {
    where: {
      IDcompte: { inq: accountList.map((account) => account.IDcompte) },
      or: [
        { NomOp: { like: `%${searchTerms}%` } },
        { MontantOp: { like: `%${searchTerms}%` } }
      ]
    },
    order: 'DateOp DESC',
    limit,
    skip
  }

  return apiGet(APIURL + '/api/operations', {
    token: userToken,
    params: { filter }
  })
}

export const generateRecurringOperations = (userToken, APIURL) => {
  apiPost(APIURL + '/api/operation-recurrentes/auto-generation', {}, {
    token: userToken
  })
}

export const fetchRecurrOperation = (userToken, APIURL) => {
  const filter = {
    order: 'DernierDateOpRecu DESC, NomOpRecu ASC'
  }

  return apiGet(APIURL + '/api/operation-recurrentes', {
    token: userToken,
    params: { filter }
  })
}

export const updateRecurringOperation = (operationRecurrente, userToken, APIURL) => {
  if (operationRecurrente.IDopRecu) {
    return apiPut(
      APIURL + '/api/operation-recurrentes/' + operationRecurrente.IDopRecu,
      { ...operationRecurrente, IDopRecu: undefined },
      { token: userToken }
    )
  }

  return apiPost(
    APIURL + '/api/operation-recurrentes/',
    operationRecurrente,
    { token: userToken }
  )
}

export const deleteRecurringOperation = (IDopRecu, userToken, APIURL) =>
  apiDelete(APIURL + '/api/operation-recurrentes/' + IDopRecu, {
    token: userToken
  })

export const fetchOperations = (where, userToken, APIURL) => {
  const filter = {
    where,
    order: 'DateOp DESC'
  }

  return apiGet(APIURL + '/api/operations', {
    token: userToken,
    params: { filter }
  })
}

export const suggestCategories = async (
  operationName,
  userToken,
  APIURL,
  limit = 5
) => {
  try {
    return await apiGet(APIURL + '/api/operations/suggestCategories', {
      token: userToken,
      params: { operationName, limit }
    })
  } catch {
    return []
  }
}

export default {
  fetchOperationsForAccount,
  updateOperation,
  deleteOperation,
  fetchSearchOperations,
  generateRecurringOperations,
  fetchRecurrOperation,
  updateRecurringOperation,
  deleteRecurringOperation,
  fetchOperations,
  suggestCategories
}
