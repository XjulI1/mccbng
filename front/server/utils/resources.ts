import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  banques, biens, categories, comptes, credits, operationRecurrentes, operations
} from '../db/schema'
import { getDb } from '../db/client'
import type { CrudResource } from './crud'
import { conflict, notFound } from './errors'
import { assertCompteOwned, compteScope, getCurrentUserId } from './scope'
import { boolish, numeric } from './validate'

const str = z.string()
const date = z.coerce.date()

// Schéma de création/remplacement : champs obligatoires + facultatifs ; PATCH = tout facultatif.
// Les clés absentes du schéma (IDuser, clés primaires, IDopRecu…) sont ignorées : le serveur les impose.
const shape = (required: z.ZodRawShape, optional: z.ZodRawShape = {}) => {
  const opt = Object.fromEntries(Object.entries(optional).map(([k, v]) => [k, (v as z.ZodType).optional()]))
  const create = z.object({ ...required, ...opt })
  return { create, patch: create.partial() }
}

const userId = (event: Parameters<typeof getCurrentUserId>[0]) => getCurrentUserId(event)

export const banqueResource: CrudResource = {
  path: 'banques', label: 'Banque', table: banques, pk: 'IDbanque',
  ...shape({ NomBanque: str })
}

export const compteResource: CrudResource = {
  path: 'comptes', label: 'Compte', table: comptes, pk: 'IDcompte',
  readScope: event => eq(comptes.IDuser, userId(event)),
  forced: event => ({ IDuser: userId(event) }),
  defaults: { bloque: false, joint: false, children: false, retraite: false, porte_feuille: false, visible: true },
  ...shape(
    { NomCompte: str, solde: numeric },
    {
      bloque: boolish, joint: boolish, children: boolish, retraite: boolish, porte_feuille: boolish, visible: boolish,
      IDbanque: numeric.nullable()
    }
  ),
  relations: {
    banque: async (rows) => {
      const ids = [...new Set(rows.map(r => r.IDbanque).filter((id): id is number => typeof id === 'number'))]
      if (!ids.length) return rows
      const found = await getDb().select().from(banques).where(inArray(banques.IDbanque, ids))
      const byId = new Map(found.map(b => [b.IDbanque, b]))
      return rows.map(r => (byId.has(r.IDbanque) ? { ...r, banque: byId.get(r.IDbanque) } : r))
    }
  },
  onDelete: async (_event, existing, tx) => {
    const id = existing.IDcompte as number
    const count = async (table: typeof operations | typeof operationRecurrentes | typeof credits) =>
      Number((await tx.select({ n: sql<number>`count(*)` }).from(table as typeof operations).where(eq((table as typeof operations).IDcompte, id)))[0]?.n ?? 0)
    const total = (await count(operations)) + (await count(operationRecurrentes)) + (await count(credits))
    if (total > 0) {
      throw conflict(
        `Compte ${id} cannot be deleted: it is referenced by at least one Operation, OperationRecurrente or Credit. Hide it instead by setting visible=false.`
      )
    }
  }
}

export const categorieResource: CrudResource = {
  path: 'categories', label: 'Categorie', table: categories, pk: 'IDcat',
  // Lecture : catégories de l'utilisateur + partagées (IDuser = 0) ; écriture : celles de l'utilisateur uniquement
  readScope: event => inArray(categories.IDuser, [0, userId(event)]),
  writeScope: event => eq(categories.IDuser, userId(event)),
  forced: event => ({ IDuser: userId(event) }),
  defaults: { Type: 'depense' },
  ...shape({ Nom: str }, { Type: z.enum(['depense', 'revenu', 'transfert']) })
}

const assertCompteInBody = async (event: Parameters<typeof assertCompteOwned>[0], data: Record<string, any>) => {
  if (data.IDcompte !== undefined) await assertCompteOwned(event, data.IDcompte)
}

export const operationResource: CrudResource = {
  path: 'operations', label: 'Operation', table: operations, pk: 'IDop',
  readScope: event => compteScope(event, operations.IDcompte),
  defaults: { CheckOp: false, IDcat: 0, amortissement: false },
  validate: assertCompteInBody,
  ...shape(
    { NomOp: str, MontantOp: numeric, DateOp: date, IDcompte: numeric },
    { CheckOp: boolish, IDcat: numeric, amortissement: boolish, IDcredit: numeric.nullable() }
  )
}

export const operationRecurrenteResource: CrudResource = {
  path: 'operation-recurrentes', label: 'OperationRecurrente', table: operationRecurrentes, pk: 'IDopRecu',
  readScope: event => compteScope(event, operationRecurrentes.IDcompte),
  defaults: { JourNumOpRecu: 1, MoisOpRecu: 1, Frequence: 3, IDcat: 0 },
  validate: assertCompteInBody,
  ...shape(
    { NomOpRecu: str, MontantOpRecu: numeric, JourOpRecu: numeric, DernierDateOpRecu: date, IDcompte: numeric },
    { JourNumOpRecu: numeric, MoisOpRecu: numeric, Frequence: numeric, IDcat: numeric, IDcredit: numeric.nullable() }
  )
}

export const creditResource: CrudResource = {
  path: 'credits', label: 'Credit', table: credits, pk: 'IDcredit',
  readScope: event => eq(credits.IDuser, userId(event)),
  forced: event => ({ IDuser: userId(event) }),
  defaults: { Statut: 'actif', IDcat: 0 },
  // IDopRecu est un lien géré par le serveur (récurrente de mensualité)
  preserve: ['IDopRecu'],
  validate: assertCompteInBody,
  ...shape(
    { NomCredit: str, MontantInitial: numeric, MontantMensuel: numeric, DateDebut: date, DateFin: date, IDcompte: numeric },
    { NomPreteur: str.nullable(), TauxInteret: numeric.nullable(), Statut: str, IDcat: numeric }
  ),
  // Création du crédit + de sa récurrente mensuelle dans la même transaction
  onCreate: async (_event, data, tx) => {
    const [created] = await tx.insert(credits).values(data as never)
    const creditId = (created as unknown as { insertId: number }).insertId
    const debut = data.DateDebut as Date
    const [recu] = await tx.insert(operationRecurrentes).values({
      NomOpRecu: `Mensualité ${data.NomCredit}`,
      MontantOpRecu: data.MontantMensuel,
      JourOpRecu: 1,
      JourNumOpRecu: debut.getUTCDate(),
      MoisOpRecu: debut.getUTCMonth(),
      Frequence: 3,
      DernierDateOpRecu: debut,
      IDcompte: data.IDcompte,
      IDcat: data.IDcat || 0,
      IDcredit: creditId
    })
    await tx.update(credits).set({ IDopRecu: (recu as unknown as { insertId: number }).insertId }).where(eq(credits.IDcredit, creditId))
    const [row] = await tx.select().from(credits).where(eq(credits.IDcredit, creditId)).limit(1)
    return row as Record<string, any>
  },
  onDelete: async (_event, existing, tx) => {
    if (existing.IDopRecu) await tx.delete(operationRecurrentes).where(eq(operationRecurrentes.IDopRecu, existing.IDopRecu))
    await tx.update(operations).set({ IDcredit: null }).where(eq(operations.IDcredit, existing.IDcredit))
  }
}

export const bienResource: CrudResource = {
  path: 'biens', label: 'Bien', table: biens, pk: 'IDbien',
  readScope: event => eq(biens.IDuser, userId(event)),
  forced: event => ({ IDuser: userId(event) }),
  defaults: { Usage: 'principale', FraisAgence: 0, ApportCash: 0 },
  validate: async (event, data) => {
    if (!data.IDcredit) return
    const [credit] = await getDb().select({ id: credits.IDcredit }).from(credits)
      .where(and(eq(credits.IDcredit, data.IDcredit), eq(credits.IDuser, userId(event)), isNotNull(credits.IDcredit))).limit(1)
    if (!credit) throw notFound(`Credit ${data.IDcredit} not found`)
  },
  ...shape(
    { NomBien: str, Ville: str, TypeBien: str, DateAchat: date, PrixBienNu: numeric, FraisNotaire: numeric },
    {
      Surface: numeric.nullable(), Usage: str, FraisAgence: numeric.nullable(), ApportCash: numeric.nullable(),
      ValeurActuelle: numeric.nullable(), IDcredit: numeric.nullable()
    }
  )
}

export const crudResources: Record<string, CrudResource> = Object.fromEntries(
  [banqueResource, compteResource, categorieResource, operationResource, operationRecurrenteResource, creditResource, bienResource]
    .map(resource => [resource.path, resource])
)
