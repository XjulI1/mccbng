// Totaux pointés / non pointés d'opérations (alias `o`), arrondis à 2 décimales.
// CheckOp NULL (donnée historique) est lu comme non pointé.
export const CHECKED_TOTALS =
  'ROUND(SUM(CASE WHEN o.CheckOp = 1 THEN o.MontantOp END), 2) AS TotalChecked, ' +
  'ROUND(SUM(CASE WHEN COALESCE(o.CheckOp, 0) = 0 THEN o.MontantOp END), 2) AS TotalNotChecked'

// Contrat historique : un côté sans opération est absent de la ligne (et non null).
export const withoutNullTotals = <T extends Record<string, unknown>>(row: T): T =>
  Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null)) as T
