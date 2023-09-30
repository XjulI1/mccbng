export const initialState = {
  operationsOfActiveAccount: undefined
}

export const operationFromCurrentList = ({ operationsOfActiveAccount }) => {
  return (operationID) => {
    return operationsOfActiveAccount.find(operation => parseInt(operationID) === operation.IDop)
  }
}

export default {
  initialState,
  operationFromCurrentList
}
