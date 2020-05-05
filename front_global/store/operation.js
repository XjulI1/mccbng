export const initialState = {
  operationsOfActiveAccount: []
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
