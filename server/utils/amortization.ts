export type AmortizationCredit = { MontantInitial: number; TauxInteret: number | null }
export type CreditPayment = { MontantOp: number; DateOp: Date }

export const monthIndex = (date: Date) => date.getUTCFullYear() * 12 + date.getUTCMonth()

export const amortize = (credit: AmortizationCredit, payments: CreditPayment[]) => {
  const monthlyRate = (credit.TauxInteret ?? 0) / 100 / 12
  let solde = credit.MontantInitial
  let cursor = payments.length ? monthIndex(payments[0]!.DateOp) - 1 : 0
  let paye = 0
  let interets = 0
  for (const payment of payments) {
    const month = monthIndex(payment.DateOp)
    const interet = solde * monthlyRate * Math.max(0, month - cursor)
    const principal = Math.min(solde, Math.max(0, Math.abs(payment.MontantOp) - interet))
    interets += interet
    paye += principal
    solde -= principal
    cursor = Math.max(cursor, month)
  }
  return { solde, paye, interets }
}
