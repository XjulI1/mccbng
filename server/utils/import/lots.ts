import { and, eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { importLignes, importLots, operations } from '../../db/schema'
import { badRequest, conflict, notFound } from '../errors'
import { round2 } from '../money'
import { rawExecute, rawQuery } from '../sql'
import type { Doublon } from './doublons'
import type { LigneNormalisee } from './normalize'

export type SourceImport = 'texte' | 'image' | 'video' | 'mixte'
type Statut = 'brouillon' | 'valide' | 'abandonne'

interface LotRow { IDimport: number; IDuser: number; IDcompte: number; Statut: Statut; Source: string; DateCreation: Date }

export interface LigneLot {
  IDligne: number
  Ordre: number
  DateOp: Date
  LibelleSource: string
  NomOp: string
  MontantOp: number
  IDcat: number
  Confiance: 'haute' | 'moyenne' | 'faible'
  IDopDoublon: number | null
  DoublonLot: boolean
  Selection: boolean
  // Opération existante soupçonnée d'être la même (affichée en revue)
  doublon: { IDop: number; NomOp: string; DateOp: Date; MontantOp: number } | null
}

export type Lot = Omit<LotRow, 'IDuser'> & { lignes: LigneLot[] }

const PURGE_JOURS = 30

// Lot de l'utilisateur (404 sinon, y compris pour le lot d'un autre utilisateur)
const findLot = async (userId: number, id: number): Promise<LotRow> => {
  const [lot] = await rawQuery<LotRow>(
    'SELECT IDimport, IDuser, IDcompte, Statut, Source, DateCreation FROM ImportLot WHERE IDimport = ? AND IDuser = ?', [id, userId]
  )
  if (!lot) throw notFound(`Import ${id} not found`)
  return lot
}

export const loadLot = async (userId: number, id: number): Promise<Lot> => {
  const { IDuser: _, ...lot } = await findLot(userId, id)
  const rows = await rawQuery<Omit<LigneLot, 'doublon' | 'DoublonLot' | 'Selection'> & {
    DoublonLot: number; Selection: number; dIDop: number | null; dNomOp: string | null; dDateOp: Date | null; dMontantOp: number | null
  }>(
    'SELECT l.IDligne, l.Ordre, l.DateOp, l.LibelleSource, l.NomOp, l.MontantOp, l.IDcat, l.Confiance, l.IDopDoublon, l.DoublonLot, l.Selection, ' +
    'o.IDop AS dIDop, o.NomOp AS dNomOp, o.DateOp AS dDateOp, o.MontantOp AS dMontantOp ' +
    'FROM ImportLigne l LEFT JOIN Operation o ON o.IDop = l.IDopDoublon AND o.IDcompte = ? ' +
    'WHERE l.IDimport = ? ORDER BY l.Ordre, l.IDligne',
    [lot.IDcompte, id]
  )
  return {
    ...lot,
    lignes: rows.map(({ dIDop, dNomOp, dDateOp, dMontantOp, ...ligne }) => ({
      ...ligne,
      DoublonLot: Boolean(ligne.DoublonLot),
      Selection: Boolean(ligne.Selection),
      doublon: dIDop ? { IDop: dIDop, NomOp: dNomOp!, DateOp: dDateOp!, MontantOp: dMontantOp! } : null
    }))
  }
}

export const listBrouillons = (userId: number) =>
  rawQuery<{ IDimport: number; IDcompte: number; NomCompte: string | null; Source: string; DateCreation: Date; nbLignes: number }>(
    'SELECT i.IDimport, i.IDcompte, c.NomCompte, i.Source, i.DateCreation, COUNT(l.IDligne) AS nbLignes ' +
    'FROM ImportLot i LEFT JOIN Compte c ON c.IDcompte = i.IDcompte AND c.IDuser = i.IDuser ' +
    'LEFT JOIN ImportLigne l ON l.IDimport = i.IDimport ' +
    "WHERE i.IDuser = ? AND i.Statut = 'brouillon' " +
    'GROUP BY i.IDimport ORDER BY i.DateCreation DESC, i.IDimport DESC',
    [userId]
  ).then(rows => rows.map(r => ({ ...r, nbLignes: Number(r.nbLignes) })))

// Lots non validés de plus de 30 jours (les lignes suivent par ON DELETE CASCADE). Les lots validés sont conservés :
// ils portent les correspondances apprises.
export const purgeBrouillons = (userId: number) =>
  rawExecute(
    "DELETE FROM ImportLot WHERE IDuser = ? AND Statut <> 'valide' AND DateCreation < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)",
    [userId, PURGE_JOURS]
  )

export const createLot = async (
  userId: number,
  lot: { IDcompte: number; Source: SourceImport; Modele: string; TokensEntree: number; TokensSortie: number },
  lignes: (LigneNormalisee & Doublon)[]
): Promise<number> =>
  getDb().transaction(async (tx) => {
    const [result] = await tx.insert(importLots).values({ ...lot, IDuser: userId, Statut: 'brouillon', DateCreation: new Date() })
    const IDimport = (result as unknown as { insertId: number }).insertId
    await tx.insert(importLignes).values(lignes.map((ligne, Ordre) => ({
      IDimport, Ordre, DateOp: ligne.DateOp, LibelleSource: ligne.LibelleSource, CleSource: ligne.CleSource, NomOp: ligne.NomOp,
      MontantOp: ligne.MontantOp, IDcat: ligne.IDcat, Confiance: ligne.Confiance, IDopDoublon: ligne.IDopDoublon,
      DoublonLot: ligne.DoublonLot, Selection: ligne.Selection
    })))
    return IDimport
  })

export interface LigneValidee { IDligne?: number; DateOp: Date; NomOp: string; MontantOp: number; IDcat: number }

// Crée les opérations retenues et enregistre les valeurs finales des lignes (correspondances apprises), en une transaction.
export const validateLot = async (userId: number, id: number, lignes: LigneValidee[]): Promise<number[]> => {
  const lot = await findLot(userId, id)
  if (lot.Statut !== 'brouillon') throw conflict(`Import ${id} is already ${lot.Statut}`)

  const [compte] = await rawQuery('SELECT IDcompte FROM Compte WHERE IDcompte = ? AND IDuser = ?', [lot.IDcompte, userId])
  if (!compte) {
    await rawExecute("UPDATE ImportLot SET Statut = 'abandonne' WHERE IDimport = ?", [id])
    throw notFound(`Compte ${lot.IDcompte} not found`)
  }

  const categoriesDemandees = [...new Set(lignes.map(l => l.IDcat).filter(idcat => idcat !== 0))]
  if (categoriesDemandees.length) {
    const lisibles = await rawQuery<{ IDcat: number }>('SELECT IDcat FROM Categorie WHERE IDcat IN (?) AND IDuser IN (?, 0)', [categoriesDemandees, userId])
    const ok = new Set(lisibles.map(c => c.IDcat))
    const interdite = categoriesDemandees.find(idcat => !ok.has(idcat))
    if (interdite !== undefined) throw badRequest(`Categorie ${interdite} not found`)
  }

  const idsLignes = lignes.flatMap(l => (l.IDligne === undefined ? [] : [l.IDligne]))
  if (new Set(idsLignes).size !== idsLignes.length) throw badRequest('Duplicate IDligne')
  if (idsLignes.length) {
    const existantes = await rawQuery<{ IDligne: number }>('SELECT IDligne FROM ImportLigne WHERE IDimport = ? AND IDligne IN (?)', [id, idsLignes])
    if (existantes.length !== idsLignes.length) throw badRequest(`IDligne not in import ${id}`)
  }

  return getDb().transaction(async (tx) => {
    // Verrou : deux validations concurrentes du même lot ne créent jamais deux fois les opérations
    const [verrou] = await tx.select({ Statut: importLots.Statut }).from(importLots).where(eq(importLots.IDimport, id)).for('update')
    if (verrou?.Statut !== 'brouillon') throw conflict(`Import ${id} is already ${verrou?.Statut ?? 'deleted'}`)

    const ids: number[] = []
    for (const ligne of lignes) {
      const [result] = await tx.insert(operations).values({
        NomOp: ligne.NomOp, MontantOp: round2(ligne.MontantOp), DateOp: ligne.DateOp, IDcompte: lot.IDcompte, IDcat: ligne.IDcat,
        // Lignes lues sur un relevé, donc déjà passées en banque : créées pointées
        CheckOp: true, amortissement: false
      })
      ids.push((result as unknown as { insertId: number }).insertId)
    }

    await tx.update(importLignes).set({ Selection: false }).where(eq(importLignes.IDimport, id))
    for (const ligne of lignes) {
      if (ligne.IDligne === undefined) continue
      await tx.update(importLignes)
        .set({ NomOp: ligne.NomOp, IDcat: ligne.IDcat, DateOp: ligne.DateOp, MontantOp: round2(ligne.MontantOp), Selection: true })
        .where(and(eq(importLignes.IDimport, id), eq(importLignes.IDligne, ligne.IDligne)))
    }
    await tx.update(importLots).set({ Statut: 'valide', DateValidation: new Date() }).where(eq(importLots.IDimport, id))
    return ids
  })
}

// Abandon d'un brouillon (un lot validé reste : il porte les correspondances apprises)
export const deleteLot = async (userId: number, id: number): Promise<void> => {
  const lot = await findLot(userId, id)
  if (lot.Statut === 'valide') throw conflict(`Import ${id} is already valide`)
  await rawExecute('DELETE FROM ImportLot WHERE IDimport = ?', [id])
}
