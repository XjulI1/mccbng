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
type BienInput = BienPrice & RentalTerms & {
  ValeurActuelle: number | null; Usage: string; DateAchat: Date; TauxPlacement: number | null
}
/** `emprunte` = amount borrowed, `capitalParMois` = principal repaid per month index. */
export type CreditPaid = { interets: number; mensualites: number; emprunte: number; capitalParMois: Map<number, number> }
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

export const paidOnCredit = (credit: AmortizationCredit, payments: CreditPayment[]): CreditPaid => {
  const capitalParMois = new Map<number, number>()
  const { interets } = amortize(credit, payments, (month, principal) =>
    capitalParMois.set(month, (capitalParMois.get(month) ?? 0) + principal))
  return {
    interets,
    mensualites: payments.reduce((sum, payment) => sum + Math.abs(payment.MontantOp), 0),
    emprunte: credit.MontantInitial,
    capitalParMois
  }
}

export const TAUX_PLACEMENT_DEFAUT = 3

/**
 * Owning a bien that is not rented vs renting an equivalent home since the purchase month (current month excluded):
 * rents avoided minus what the money tied in the bien (price not borrowed, then each principal repaid) would have
 * earned if placed, compounded monthly. Null for a rented bien or without an equivalent rent (`LoyerMensuel`).
 */
const comparaisonLocationOf = (bien: BienInput, gainTotal: number, prixTotal: number, paid: CreditPaid | null, today: Date) => {
  if (bien.Usage === 'locatif' || bien.LoyerMensuel === null) return null
  const from = monthIndex(bien.DateAchat)
  const mois = Math.max(0, monthIndex(today) - from)
  const tauxPlacement = bien.TauxPlacement ?? TAUX_PLACEMENT_DEFAUT
  const monthlyRate = tauxPlacement / 100 / 12
  let placement = Math.max(0, prixTotal - (paid?.emprunte ?? 0))
  let coutOpportunite = 0
  for (let month = from; month < from + mois; month++) {
    const rendement = placement * monthlyRate
    coutOpportunite += rendement
    placement += rendement + (paid?.capitalParMois.get(month) ?? 0)
  }
  const loyersEvites = bien.LoyerMensuel * mois
  return {
    mois,
    loyerMensuel: bien.LoyerMensuel,
    tauxPlacement,
    loyersEvites: round2(loyersEvites),
    coutOpportunite: round2(coutOpportunite),
    gain: round2(gainTotal + loyersEvites - coutOpportunite)
  }
}

/**
 * Rents avoided while the owner lived in a rented bien: from the purchase month to the month of `DateMiseEnLocation`
 * (current month at most), at the expected rent turned charges included with `AbattementCharges`, since the charges of
 * that period are linked to the bien. Null without an expected rent or an occupation before the letting.
 */
const occupationOf = (bien: BienInput, today: Date) => {
  if (bien.Usage !== 'locatif' || bien.LoyerMensuel === null || !bien.DateMiseEnLocation) return null
  const mois = Math.min(monthIndex(bien.DateMiseEnLocation), monthIndex(today)) - monthIndex(bien.DateAchat)
  if (mois <= 0) return null
  const factor = abatementFactor(bien.AbattementCharges)
  const loyerMensuel = round2(factor > 0 ? bien.LoyerMensuel / factor : bien.LoyerMensuel)
  return { mois, loyerMensuel, loyersEvites: round2(loyerMensuel * mois) }
}

const bilanOf = (bien: BienInput, cumul: Totals, prixTotal: number, paid: CreditPaid | null, today: Date) => {
  const plusValue = bien.ValeurActuelle ? bien.ValeurActuelle - prixTotal : 0
  const loyersNets = cumul.loyers - cumul.charges
  const interets = paid ? paid.interets : 0
  const mensualites = paid ? paid.mensualites : null
  const occupation = occupationOf(bien, today)
  return {
    plusValue: round2(plusValue),
    loyersNets: round2(loyersNets),
    interets: round2(interets),
    occupation,
    gainTotal: round2(plusValue + loyersNets - interets + (occupation?.loyersEvites ?? 0)),
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
  const bilan = bilanOf(bien, cumul, prixTotal, paid, today)
  return {
    periode,
    loyers: round2(totals.loyers),
    charges: round2(totals.charges),
    loyerMensuelMoyen: perMonth(loyersHorsCharges, periode.mois),
    attendu: { loyerMensuel: bien.LoyerMensuel },
    cumul: { loyers: round2(cumul.loyers), charges: round2(cumul.charges) },
    bilan,
    comparaisonLocation: comparaisonLocationOf(bien, bilan.gainTotal, prixTotal, paid, today)
  }
}

const isRunning = (credit: CreditInput, today: Date) =>
  (credit.Statut ?? 'actif') === 'actif' && credit.DateFin >= startOfUtcDay(today)

export const creditRentabilite = (credit: CreditInput, bien: LinkedBien | null, flows: Flow[], today: Date) => {
  const classified = classify(flows, today, credit.IDcredit).filter(flow => flow.kind !== 'charge')
  const { periode, totals } = periodTotals(classified, today, rentalStart(bien?.DateMiseEnLocation ?? null, classified))
  const abatement = abatementFactor(bien?.AbattementCharges)
  const loyersCouverts = totals.loyers * abatement
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
    cumul: { loyers: round2(cumul.loyers), mensualites: round2(cumul.mensualites) },
    partCreditLoyers: bien ? percent(cumul.loyers * abatement, cumul.mensualites) : null
  }
}
