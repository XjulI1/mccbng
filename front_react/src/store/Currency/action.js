export const CHANGE_CURRENCY = 'CHANGE_CURRENCY'

export function changeCurrency (newCurrency) {
  return { type: CHANGE_CURRENCY, newCurrency }
}
