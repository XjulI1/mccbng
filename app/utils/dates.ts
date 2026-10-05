// Intervalles semi-ouverts [début ; début de la période suivante[ en UTC, au format ISO strict (accepté par tous
// les navigateurs), pour filtrer DateOp sans borne « 23:59:59 ».
export interface DateRange {
  from: Date
  to: Date
}

// `month` de 1 à 12
export const monthRange = (year: number, month: number): DateRange => ({
  from: new Date(Date.UTC(Number(year), Number(month) - 1, 1)),
  to: new Date(Date.UTC(Number(year), Number(month), 1))
})

// Jours YYYY-MM-DD, `to` inclus
export const dayRange = (from: string, to: string): DateRange => {
  const end = new Date(`${to}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() + 1)
  return { from: new Date(`${from}T00:00:00.000Z`), to: end }
}

// Conditions `and` du filtre d'opérations pour un intervalle
export const dateOpWithin = ({ from, to }: DateRange) => [
  { DateOp: { gte: from } },
  { DateOp: { lt: to } }
]
