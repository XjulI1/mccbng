export const SAVE_ACCOUNT_LIST = 'SAVE_ACCOUNT_LIST'
export const SAVE_SUM_FOR_ALL_ACCOUNTS = 'SAVE_SUM_FOR_ALL_ACCOUNTS'

export function saveAccountList (accountList) {
  return { type: SAVE_ACCOUNT_LIST, accountList }
}

export function saveSumForAllAccounts (sumList) {
  return { type: SAVE_SUM_FOR_ALL_ACCOUNTS, sumList }
}
