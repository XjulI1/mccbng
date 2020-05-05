import axios from 'axios'

export const fetchOperationsForAccount = (IDcompte, userToken, APIURL) => {
  const filters = {
    where: { IDcompte },
    order: 'CheckOp ASC, DateOp DESC',
    limit: 35
  }

  return axios.get(APIURL + '/api/Operations', {
    params: {
      access_token: userToken,
      filter: filters
    }
  }).then((response) => {
    return response.data
  })
}

export const updateOperation = (operation, userToken, APIURL) => {
  return axios.patch(APIURL + '/api/Operations', operation, {
    params: {
      access_token: userToken
    }
  })
}

export const deleteOperation = (IDoperation, userToken, APIURL) => {
  return axios.delete(APIURL + '/api/Operations/' + IDoperation, {
    params: {
      access_token: userToken
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

  return axios.get(APIURL + '/api/Operations', {
    params: {
      access_token: userToken,
      filter
    }
  }).then((response) => {
    return response.data
  })
}

export const generateRecurringOperations = (userID, userToken, APIURL) => {
  axios.post(APIURL + '/api/OperationRecurrentes/autoGeneration?access_token=' + userToken, {
    userID
  })
}

export const fetchRecurrOperation = (userToken, APIURL) => {
  const filter = {
    order: 'DernierDateOpRecu ASC, NomOpRecu ASC'
  }

  return axios.get(APIURL + '/api/OperationRecurrentes', {
    params: {
      access_token: userToken,
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
