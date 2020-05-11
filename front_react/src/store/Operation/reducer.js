import { SAVE_CURRENT_ACCOUNT_OPERATIONS } from './action'
import { initialState } from 'mccbng_store/operation'

const saveCurrentAccountOperations = function (state, operationsList) {
  return { ...state, ...{ operationsOfActiveAccount: operationsList } }
}

export default function (state = initialState, action) {
  switch (action.type) {
    case SAVE_CURRENT_ACCOUNT_OPERATIONS:
      return saveCurrentAccountOperations(state, action.operationsList)
    default:
      return state
  }
}
