import { CHANGE_CURRENCY } from './action'

const initialState = {
  value: '€'
}

const changeCurrency = function (state, newCurrency) {
  return { ...state, ...{ value: newCurrency } }
}

export default function (state = initialState, action) {
  switch (action.type) {
    case CHANGE_CURRENCY:
      return changeCurrency(state, action.newCurrency)
    default:
      return state
  }
}
