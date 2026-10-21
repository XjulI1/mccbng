import { operations } from '../db/schema'
import { amortize, monthIndex, type AmortizationCredit, type CreditPayment } from './amortization'
import { round2 } from './money'
import { addDays, startOfUtcDay } from './schedule'

export type Flow = { IDbien: number | null; IDcredit: number | null; MontantOp: number; DateOp: Date }
export type FlowKind = 'loyer' | 'charge' | 'mensualite'
export type Periode = { debut: string | null; fin: string | null; mois: number }

type Totals = { loyers: number; charges: number; mensualites: number }
type BienPrice = { PrixBienNu: number; FraisNotaire: number; FraisAgence: number | null }
type RentalTerms = { LoyerMensuel: number | null; AbattementCharges: number | null; DateMiseEnLocation: Date | null }
type BienInput = BienPrice & RentalTerms & { ValeurActuelle: number | null }
export type CreditPaid = { interets: number; mensualites: number }
type CreditInput = { IDcredit: number; MontantMensuel: number; Statut: string | null; DateFin: Date }
type LinkedBien = RentalTerms & { IDbien: number }

export const flowColumns = {
  IDbien: operations.IDbien,
  IDcredit: operations.IDcredit,
  MontantOp: operations.MontantOp,
  DateOp: operations.DateOp
}

const monthLabel = (index: number) => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`

export const flowKind = (flow: Flow, creditId?: number): FlowKind | null => {
  if (flow.IDcredit) return flow.IDcredit === creditId && flow.MontantOp < 0 ? 'mensualite' : null
  if (!flow.IDbien || flow.MontantOp === 0) return null
  return flow.MontantOp > 0 ? 'loyer' : 'charge'
}

export const rentalPeriod = (today: Date, start: Date | undefined) => {
  const current = monthIndex(today)
  const from = start ? monthIndex(start) : current
  const mois = Math.max(0, current - from)
  const periode: Periode = mois
    ? { debut: monthLabel(from), fin: monthLabel(current - 1), mois }
    : { debut: null, fin: null, mois: 0 }
  return { from, to: current - 1, periode }
}

const classify = (flows: Flow[], today: Date, creditId?: number) => {
  const tomorrow = addDays(startOfUtcDay(today), 1)
  return flows
    .filter(flow => flow.DateOp < tomorrow)
    .flatMap(flow => {
      const kind = flowKind(flow, creditId)
      return kind ? [{ kind, amount: Math.abs(flow.MontantOp), month: monthIndex(flow.DateOp), date: flow.DateOp }] : []
    })
}

type Classified = ReturnType<typeof classify>[number]

const totalsOf = (flows: Classified[]): Totals => {
  const totals: Totals = { loyers: 0, charges: 0, mensualites: 0 }
  for (const flow of flows) {
    if (flow.kind === 'loyer') totals.loyers += flow.amount
    else if (flow.kind === 'charge') totals.charges += flow.amount
    else totals.mensualites += flow.amount
  }
  return totals
}

const earliest = (dates: (Date | null | undefined)[]) =>
  dates.reduce<Date | undefined>((oldest, date) => (date && (!oldest || date < oldest) ? date : oldest), undefined)

const oldestDate = (flows: Classified[]) => earliest(flows.map(flow => flow.date))

const rentalStart = (declared: Date | null, flows: Classified[]) =>
  declared ?? oldestDate(flows.filter(flow => flow.kind === 'loyer'))

const periodTotals = (flows: Classified[], today: Date, start: Date | undefined) => {
  const { from, to, periode } = rentalPeriod(today, start)
  return { periode, totals: totalsOf(flows.filter(flow => flow.month >= from && flow.month <= to)) }
}

const abatementFactor = (abattement: number | null | undefined) => 1 - (abattement ?? 0) / 100

const perMonth = (amount: number, mois: number) => (mois ? round2(amount / mois) : null)
const percent = (numerator: number, denominator: number) => (denominator ? round2((numerator / denominator) * 100) : null)

const prixTotalOf = (bien: BienPrice) => bien.PrixBienNu + bien.FraisNotaire + (bien.FraisAgence ?? 0)

export const paidOnCredit = (credit: AmortizationCredit, payments: CreditPayment[]): CreditPaid => ({
  interets: amortize(credit, payments).interets,
  mensualites: payments.reduce((sum, payment) => sum + Math.abs(payment.MontantOp), 0)
})

const bilanOf = (bien: BienInput, cumul: Totals, prixTotal: number, paid: CreditPaid | null) => {
  const plusValue = bien.ValeurActuelle ? bien.ValeurActuelle - prixTotal : 0
  const loyersNets = cumul.loyers - cumul.charges
  const interets = paid ? paid.interets : 0
  const mensualites = paid ? paid.mensualites : null
  return {
    plusValue: round2(plusValue),
    loyersNets: round2(loyersNets),
    interets: round2(interets),
    gainTotal: round2(plusValue + loyersNets - interets),
    mensualites: mensualites === null ? null : round2(mensualites),
    partCreditLoyers: mensualites === null ? null : percent(cumul.loyers * abatementFactor(bien.AbattementCharges), mensualites)
  }
}

export const bienRentabilite = (bien: BienInput, flows: Flow[], today: Date, paid: CreditPaid | null = null) => {
  const classified = classify(flows, today)
  const { periode, totals } = periodTotals(classified, today, rentalStart(bien.DateMiseEnLocation, classified))
  const cumul = totalsOf(classified)
  const prixTotal = prixTotalOf(bien)
  const loyersHorsCharges = totals.loyers * abatementFactor(bien.AbattementCharges)
  return {
    periode,
    loyers: round2(totals.loyers),
    charges: round2(totals.charges),
    loyerMensuelMoyen: perMonth(loyersHorsCharges, periode.mois),
    attendu: { loyerMensuel: bien.LoyerMensuel },
    cumul: { loyers: round2(cumul.loyers), charges: round2(cumul.charges) },
    bilan: bilanOf(bien, cumul, prixTotal, paid)
  }
}

const isRunning = (credit: CreditInput, today: Date) =>
  (credit.Statut ?? 'actif') === 'actif' && credit.DateFin >= startOfUtcDay(today)

export const creditRentabilite = (credit: CreditInput, bien: LinkedBien | null, flows: Flow[], today: Date) => {
  const classified = classify(flows, today, credit.IDcredit).filter(flow => flow.kind !== 'charge')
  const { periode, totals } = periodTotals(classified, today, rentalStart(bien?.DateMiseEnLocation ?? null, classified))
  const loyersCouverts = totals.loyers * abatementFactor(bien?.AbattementCharges)
  const cumul = totalsOf(classified)
  const loyerMensuel = bien?.LoyerMensuel ?? null
  const mensualite = isRunning(credit, today) ? Math.abs(credit.MontantMensuel) : 0
  return {
    bien: bien?.IDbien ?? null,
    periode,
    loyers: round2(totals.loyers),
    mensualites: round2(totals.mensualites),
    loyerMensuelMoyen: perMonth(loyersCouverts, periode.mois),
    mensualiteMoyenne: perMonth(totals.mensualites, periode.mois),
    cashFlowMensuel: perMonth(loyersCouverts - totals.mensualites, periode.mois),
    tauxCouverture: percent(loyersCouverts, totals.mensualites),
    attendu: {
      loyerMensuel,
      mensualite,
      cashFlowMensuel: loyerMensuel === null ? null : round2(loyerMensuel - mensualite),
      tauxCouverture: loyerMensuel === null ? null : percent(loyerMensuel, mensualite)
    },
    cumul: { loyers: round2(cumul.loyers), mensualites: round2(cumul.mensualites) }
  }
}
