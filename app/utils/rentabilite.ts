import { formatEuros } from './money'

export type Periode = { debut: string | null; mois: number }

export type CreditRentabilite = {
  bien: number | null
  periode: Periode
  loyers: number
  loyerMensuelMoyen: number | null
  mensualiteMoyenne: number | null
  cashFlowMensuel: number | null
  tauxCouverture: number | null
  attendu: { loyerMensuel: number | null; mensualite: number; cashFlowMensuel: number | null; tauxCouverture: number | null }
  cumul: { loyers: number }
  partCreditLoyers: number | null
}

export type BienBilan = {
  plusValue: number
  loyersNets: number
  interets: number
  gainTotal: number
  mensualites: number | null
  partCreditLoyers: number | null
}

export type BienRentabilite = {
  periode: Periode
  loyerMensuelMoyen: number | null
  attendu: { loyerMensuel: number | null }
  bilan: BienBilan
}

export type CreditRentalLine = { parts: string[]; prevu: boolean; depuis: string | null }
export type BienRentalBlock = { loyer: string; prevu: boolean; depuis: string | null }
export type BilanLine = { label: string; montant: string; classe: '' | 'montant-positif' | 'montant-negatif' }
export type BienBilanBlock = { lignes: BilanLine[]; gainTotal: BilanLine; partCreditLoyers: string | null }

const signedEuros = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', signDisplay: 'exceptZero' }).format(amount)

const bilanLine = (label: string, amount: number): BilanLine => ({
  label,
  montant: signedEuros(amount),
  classe: amount > 0 ? 'montant-positif' : amount < 0 ? 'montant-negatif' : ''
})

const percent = (value: number, digits: number) =>
  `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)} %`

const monthYear = (month: string | null) =>
  month
    ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))
    : null

const flowPart = (cashFlow: number) =>
  cashFlow < 0 ? `effort ${formatEuros(-cashFlow)}/mois` : `cash-flow ${formatEuros(cashFlow)}/mois`

/** Line shown on a credit card ("Loyers · mensualités · couverture · effort" over the rental), or null when the credit finances no rented bien. */
export const creditRentalLine = (rentabilite: CreditRentabilite | null | undefined): CreditRentalLine | null => {
  if (!rentabilite?.bien) return null
  const { periode, attendu } = rentabilite
  if (!(rentabilite.cumul.loyers > 0) && attendu.loyerMensuel === null) return null
  const prevu = periode.mois === 0
  const loyerMensuel = prevu ? attendu.loyerMensuel : rentabilite.loyerMensuelMoyen
  if (loyerMensuel === null) return null
  const mensualite = prevu ? attendu.mensualite : rentabilite.mensualiteMoyenne
  const tauxCouverture = prevu ? attendu.tauxCouverture : rentabilite.tauxCouverture
  const cashFlow = prevu ? attendu.cashFlowMensuel : rentabilite.cashFlowMensuel
  const parts = [`Loyers ${formatEuros(loyerMensuel)}/mois`]
  if (mensualite) parts.push(`mensualités ${formatEuros(mensualite)}/mois`)
  if (tauxCouverture !== null) parts.push(`couverture ${percent(tauxCouverture, 0)}`)
  if (cashFlow !== null) parts.push(flowPart(cashFlow))
  return { parts, prevu, depuis: prevu ? null : monthYear(periode.debut) }
}

/** Share (0-100) of the credit payments made so far covered by the rents, or null when the credit finances no rented bien. */
export const creditPartLoyers = (rentabilite: CreditRentabilite | null | undefined): number | null => {
  const part = rentabilite?.bien ? rentabilite.partCreditLoyers : null
  return part ? Math.min(100, part) : null
}

/** Average rent shown on a rented bien card, or null when neither real nor expected rent is known. */
export const bienRentalBlock = (rentabilite: BienRentabilite | null | undefined): BienRentalBlock | null => {
  if (!rentabilite) return null
  if (rentabilite.periode.mois > 0 && rentabilite.loyerMensuelMoyen !== null) {
    return { loyer: `${formatEuros(rentabilite.loyerMensuelMoyen)}/mois`, prevu: false, depuis: monthYear(rentabilite.periode.debut) }
  }
  const { loyerMensuel } = rentabilite.attendu
  return loyerMensuel === null ? null : { loyer: `${formatEuros(loyerMensuel)}/mois`, prevu: true, depuis: null }
}

/** "Bilan depuis l'achat" block of a rented bien card, or null when there is nothing to report yet. */
export const bienBilanBlock = (
  bilan: BienBilan | null | undefined, valeurActuelleRenseignee: boolean
): BienBilanBlock | null => {
  if (!bilan) return null
  if (!valeurActuelleRenseignee && !bilan.plusValue && !bilan.loyersNets && !bilan.interets) return null
  const lignes = [
    bilanLine(valeurActuelleRenseignee ? 'Plus-value' : 'Plus-value (valeur non renseignée)', bilan.plusValue),
    bilanLine('Loyers et dépenses', bilan.loyersNets)
  ]
  if (bilan.mensualites !== null) lignes.push(bilanLine('Intérêts d\'emprunt', -bilan.interets))
  return {
    lignes,
    gainTotal: bilanLine('Gain total', bilan.gainTotal),
    partCreditLoyers: bilan.partCreditLoyers === null ? null : `Crédit payé par les loyers : ${percent(bilan.partCreditLoyers, 0)}`
  }
}
