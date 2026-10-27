export interface PlafondJauge {
  /** Part du plafond utilisée, en % (au-delà de 100 quand il est dépassé). */
  percent: number
  /** Remplissage de la jauge, borné à 0-100 %. */
  largeur: number
  /** Marge avant le plafond (négative quand il est dépassé). */
  reste: number
}

/** Jauge de plafond d'un compte ; null sans plafond positif. */
export const plafondJauge = (solde: number | null | undefined, plafond: number | null | undefined): PlafondJauge | null => {
  if (!plafond || plafond <= 0) return null
  const montant = solde ?? 0
  const percent = (montant / plafond) * 100
  return {
    percent,
    largeur: Math.min(100, Math.max(0, percent)),
    reste: Math.round((plafond - montant) * 100) / 100
  }
}
