import axios from 'axios'

export const generateRecurringOperations = (userID, userToken, APIURL) => {
  axios.post(APIURL + '/api/OperationRecurrentes/autoGeneration?access_token=' + userToken, {
    userID
  })
}

export default {
  generateRecurringOperations
}
