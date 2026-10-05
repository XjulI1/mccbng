// Échéancier des opérations récurrentes : fonctions pures, en dates UTC à minuit.
// Mensuel (Frequence = 3) : une échéance par mois au jour JourNumOpRecu.
// Annuel (Frequence = 7) : une échéance par an au mois MoisOpRecu (0 = janvier) et au jour JourNumOpRecu.
// Le jour est toujours borné au dernier jour du mois (31 → 28/29 février, 30 avril…).

export const MONTHLY = 3
export const YEARLY = 7

export interface RecurrenceRule {
  Frequence: number
  JourNumOpRecu: number
  MoisOpRecu: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export const isSupportedFrequency = (frequence: unknown): frequence is typeof MONTHLY | typeof YEARLY =>
  frequence === MONTHLY || frequence === YEARLY

// Valeurs historiques NULL : jour 1, janvier.
export const toRule = (row: { Frequence?: unknown; JourNumOpRecu?: unknown; MoisOpRecu?: unknown }): RecurrenceRule => ({
  Frequence: Number(row.Frequence),
  JourNumOpRecu: Number(row.JourNumOpRecu ?? 1) || 1,
  MoisOpRecu: Number(row.MoisOpRecu ?? 0) || 0
})

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

// Échéance d'un mois donné ; `month` peut déborder (13 → janvier suivant, -1 → décembre précédent).
const dueInMonth = (rule: RecurrenceRule, year: number, month: number): Date => {
  const first = new Date(Date.UTC(year, month, 1))
  const y = first.getUTCFullYear()
  const m = first.getUTCMonth()
  return new Date(Date.UTC(y, m, Math.min(Math.max(rule.JourNumOpRecu, 1), daysInMonth(y, m))))
}

const assertFrequency = (rule: RecurrenceRule) => {
  if (!isSupportedFrequency(rule.Frequence)) throw new Error(`Unsupported Frequence ${rule.Frequence}`)
}

export const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

export const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS)

/** Échéance de la période qui suit celle de `after` (mois suivant, ou année suivante au mois MoisOpRecu). */
export const nextDueDate = (rule: RecurrenceRule, after: Date): Date => {
  assertFrequency(rule)
  if (rule.Frequence === MONTHLY) return dueInMonth(rule, after.getUTCFullYear(), after.getUTCMonth() + 1)
  return dueInMonth(rule, after.getUTCFullYear() + 1, rule.MoisOpRecu)
}

/** Échéance de la période qui précède celle de `due` : nextDueDate(rule, prevDueDate(rule, due)) = due. */
export const prevDueDate = (rule: RecurrenceRule, due: Date): Date => {
  assertFrequency(rule)
  if (rule.Frequence === MONTHLY) return dueInMonth(rule, due.getUTCFullYear(), due.getUTCMonth() - 1)
  return dueInMonth(rule, due.getUTCFullYear() - 1, rule.MoisOpRecu)
}

/** Plus petite échéance théorique postérieure ou égale au jour de `date`. */
export const firstDueOnOrAfter = (rule: RecurrenceRule, date: Date): Date => {
  assertFrequency(rule)
  const day = startOfUtcDay(date)
  const year = day.getUTCFullYear()
  if (rule.Frequence === MONTHLY) {
    const candidate = dueInMonth(rule, year, day.getUTCMonth())
    return candidate < day ? dueInMonth(rule, year, day.getUTCMonth() + 1) : candidate
  }
  const candidate = dueInMonth(rule, year, rule.MoisOpRecu)
  return candidate < day ? dueInMonth(rule, year + 1, rule.MoisOpRecu) : candidate
}

/**
 * Valeur initiale de DernierDateOpRecu : l'échéance qui précède la première échéance à générer,
 * c'est-à-dire la première postérieure ou égale à max(aujourd'hui, début). Aucun rattrapage rétroactif.
 */
export const initialLastDate = (rule: RecurrenceRule, debut: Date, today: Date = new Date()): Date => {
  const from = debut > today ? debut : today
  return prevDueDate(rule, firstDueOnOrAfter(rule, from))
}
