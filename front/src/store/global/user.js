export const initialState = {
  id: null,
  favoris: null,
  warningTotal: null,
  token: null,
  maskAmount: false
}

export const toggleMaskAmount = (maskAmount) => {
  return !maskAmount
}

export default {
  initialState,
  toggleMaskAmount
}
