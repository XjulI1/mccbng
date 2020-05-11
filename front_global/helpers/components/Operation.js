export const checkBoxID = (operationID) => {
  return 'checkboxOperationID-' + operationID
}

export const generateCssVariables = ({ IDcat, MontantOp }) => {
  return {
    category: IDcat === 0 ? 'noCategory' : '',
    montant: MontantOp > 0 ? 'montantIn' : 'montantOut'
  }
}

export const generateDateOperationVariables = ({ DateOp }) => {
  return new Date(DateOp).toLocaleDateString()
}

export default {
  checkBoxID,
  generateCssVariables,
  generateDateOperationVariables
}
