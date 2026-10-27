const euroFormat = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

/** Amount in euros in French format ("1 234,50 €"); a missing amount reads as 0,00 €. */
export const formatEuros = (amount: number | null | undefined) => euroFormat.format(amount ?? 0)
