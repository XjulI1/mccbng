import { defineApiHandler } from '../../utils/errors'
import {
  addDays, isSupportedFrequency, MONTHLY, nextDueDate, startOfUtcDay, toRule
} from '../../utils/schedule'
import { getCurrentUserId } from '../../utils/scope'
import { rawExecute, rawQuery } from '../../utils/sql'

// Fenêtre d'anticipation historique : une échéance est générée 15 jours (mensuel) ou 30 jours (annuel) à l'avance.
const ANTICIPATION_DAYS = { monthly: 15, yearly: 30 }
// Garde-fou contre une donnée aberrante : au plus 24 échéances par récurrente et par appel.
const MAX_PER_CALL = 24

const log = (level: 'warn' | 'error', data: Record<string, unknown>) =>
  console[level](JSON.stringify({ event: 'recurring-generation', ...data }))

// Génère toutes les échéances dues de chaque récurrente de l'utilisateur.
// Sans transaction (tables MyISAM) : chaque échéance est d'abord réservée par un UPDATE conditionnel
// sur DernierDateOpRecu (verrou optimiste), puis l'opération est insérée. Deux appels concurrents
// ne peuvent donc pas générer la même échéance ; l'appel perdant s'arrête pour cette récurrente.
export default defineApiHandler(async (event) => {
  const userID = getCurrentUserId(event)
  const recurrentes = await rawQuery<any>(
    'SELECT r.*, cr.IDcredit AS creditFound, cr.Statut AS creditStatut, cr.DateFin AS creditDateFin ' +
    'FROM OperationRecurrente r ' +
    'INNER JOIN Compte c ON c.IDcompte = r.IDcompte ' +
    'LEFT JOIN Credit cr ON cr.IDcredit = r.IDcredit ' +
    'WHERE c.IDuser = ?',
    [userID]
  )
  const today = startOfUtcDay(new Date())

  // Ordre historique : LoopBack dépilait la liste par la fin (pop), ce qui détermine l'ordre des IDop générés
  for (const rec of [...recurrentes].reverse()) {
    const rule = toRule(rec)
    if (!isSupportedFrequency(rule.Frequence)) continue
    if (rec.IDcredit) {
      if (rec.creditFound === null) {
        log('warn', { reason: 'orphan', IDopRecu: rec.IDopRecu, IDcredit: rec.IDcredit })
        continue
      }
      if (rec.creditStatut !== null && rec.creditStatut !== 'actif') continue
    }
    const horizon = addDays(today, rule.Frequence === MONTHLY ? ANTICIPATION_DAYS.monthly : ANTICIPATION_DAYS.yearly)
    const dateFin: Date | null = rec.IDcredit && rec.creditDateFin ? new Date(rec.creditDateFin) : null

    // `last` est renvoyé tel qu'il a été lu (heure comprise) pour que la comparaison de l'UPDATE soit exacte
    let last: Date = rec.DernierDateOpRecu
    for (let i = 0; i < MAX_PER_CALL; i++) {
      const next = nextDueDate(rule, last)
      if (next > horizon) break
      if (dateFin && next > dateFin) break

      const reserved = await rawExecute(
        'UPDATE OperationRecurrente SET DernierDateOpRecu = ? WHERE IDopRecu = ? AND DernierDateOpRecu = ?',
        [next, rec.IDopRecu, last]
      )
      if (reserved.affectedRows !== 1) break // échéance réservée par un appel concurrent

      try {
        await rawExecute(
          'INSERT INTO Operation (NomOp, MontantOp, DateOp, IDcompte, IDcat, CheckOp, IDcredit) VALUES (?, ?, ?, ?, ?, 0, ?)',
          [rec.NomOpRecu, rec.MontantOpRecu, next, rec.IDcompte, rec.IDcat ?? 0, rec.IDcredit ?? null]
        )
      } catch (error) {
        // Compensation, conditionnée à notre propre réservation pour ne pas écraser celle d'un autre appel
        await rawExecute(
          'UPDATE OperationRecurrente SET DernierDateOpRecu = ? WHERE IDopRecu = ? AND DernierDateOpRecu = ?',
          [last, rec.IDopRecu, next]
        ).catch(() => undefined)
        log('error', { reason: 'insert-failed', IDopRecu: rec.IDopRecu, due: next.toISOString(), message: (error as Error).message })
        break
      }
      last = next
    }
  }
  return {}
})
