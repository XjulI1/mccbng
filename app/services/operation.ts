import { apiDelete, apiGet, apiPost, apiPut } from './http'
import { escapeLike } from '../utils/like'

// Plafond des listes côté serveur (DEFAULT_MAX_LIMIT) : limite explicite des listes non paginées
export const MAX_LIST_LIMIT = 1000

const AMOUNT_TERM = /^-?\d+([.,]\d{1,2})?$/

// Recherche transverse : libellé contenant le terme (jokers saisis cherchés littéralement) et, si le terme est un
// nombre, montant en valeur absolue : plage [x ; x+1[ pour un entier (« 12 » → 12,00 à 12,99), égalité pour un décimal.
export const searchOperationsWhere = (searchTerms: string, compteIds: number[]) => {
  const or: Record<string, unknown>[] = [{ NomOp: { like: `%${escapeLike(searchTerms)}%` } }]
  const term = searchTerms.trim()
  if (AMOUNT_TERM.test(term)) {
    const x = Math.abs(Number(term.replace(',', '.')))
    if (/[.,]/.test(term)) {
      or.push({ MontantOp: { inq: [x, -x] } })
    } else {
      or.push({ MontantOp: { gte: x, lt: x + 1 } }, { MontantOp: { gt: -(x + 1), lte: -x } })
    }
  }
  return { IDcompte: { inq: compteIds }, or }
}

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

// Virement : le serveur crée le débit et le crédit en une requête, dans une même transaction
export const createTransfert = (transfert, userToken, APIURL) =>
  apiPost(APIURL + '/api/operations/transfert', transfert, { token: userToken })

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
    where: searchOperationsWhere(searchTerms, accountList.map((account) => account.IDcompte)),
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

export const fetchOperations = (where, limit, userToken, APIURL) => {
  const filter = {
    where,
    order: 'DateOp DESC',
    limit
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
