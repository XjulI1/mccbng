export const formatAmount = (amount) => {
  return amount?.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export default {
  formatAmount
}
