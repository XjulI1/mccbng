export const SAVE_CURRENT_ACCOUNT_OPERATIONS = 'SAVE_CURRENT_ACCOUNT_OPERATIONS'

export function saveCurrentAccountOperations (operationsList) {
  return { type: SAVE_CURRENT_ACCOUNT_OPERATIONS, operationsList }
}
