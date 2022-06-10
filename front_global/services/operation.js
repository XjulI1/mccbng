import axios from 'axios'

export const fetchOperationsForAccount = (IDcompte, userToken, APIURL) => {
  const filter = {
    where: { IDcompte },
    order: 'CheckOp ASC, DateOp DESC',
    limit: 35
  }

  return axios.get(APIURL + '/api/operations', {
    headers: {
      Authorization: 'Bearer ' + userToken
    },
    params: {
      filter
    }
  }).then((response) => {
    return response.data
  })
}

export const updateOperation = (operation, userToken, APIURL) => {
  return axios.post(APIURL + '/api/operations', operation, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  })
}

export const deleteOperation = (IDoperation, userToken, APIURL) => {
  return axios.delete(APIURL + '/api/operations/' + IDoperation, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  })
}

export const fetchSearchOperations = (searchTerms, accountList, userToken, APIURL) => {
  const filter = {
    where: {
      IDcompte: { inq: accountList.map((account) => account.IDcompte) },
      or: [
        { NomOp: { like: `%${searchTerms}%` } },
        { MontantOp: { like: `%${searchTerms}%` } }
      ]
    },
    order: 'DateOp DESC',
    limit: 20
  }

  return axios.get(APIURL + '/api/operations', {
    headers: {
      Authorization: 'Bearer ' + userToken
    },
    params: {
      filter
    }
  }).then((response) => {
    return response.data
  })
}

export const generateRecurringOperations = (userID, userToken, APIURL) => {
  axios.post(APIURL + '/api/operation-recurrentes/auto-generation/'+userID, {}, {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  })
}

export const fetchRecurrOperation = (userToken, APIURL) => {
  const filter = {
    order: 'DernierDateOpRecu ASC, NomOpRecu ASC'
  }

  return axios.get(APIURL + '/api/operation-recurrentes', {
    headers: {
      Authorization: 'Bearer ' + userToken
    },
    params: {
      filter
    }
  }).then((response) => {
    return response.data
  })
}

export default {
  fetchOperationsForAccount,
  updateOperation,
  deleteOperation,
  fetchSearchOperations,
  generateRecurringOperations,
  fetchRecurrOperation
}
