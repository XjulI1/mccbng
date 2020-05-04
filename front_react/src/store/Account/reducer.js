import { SAVE_ACCOUNT_LIST, SAVE_SUM_FOR_ALL_ACCOUNTS } from './action'
import { initialState, setSumAllAccountForUser } from 'mccbng_store/compte'

const saveAccountList = function (state, accountList) {
  return { ...state, accountList }
}

const saveSumForAllAccounts = function (state, sumList) {
  return { ...state, accountList: setSumAllAccountForUser(state.accountList, sumList) }
}

export default function (state = initialState, action) {
  switch (action.type) {
    case SAVE_ACCOUNT_LIST:
      return saveAccountList(state, action.accountList)
    case SAVE_SUM_FOR_ALL_ACCOUNTS:
      return saveSumForAllAccounts(state, action.sumList)
    default:
      return state
  }
}
