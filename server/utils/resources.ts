import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  banques, biens, categories, comptes, credits, operationRecurrentes, operations
} from '../db/schema'
import { getDb } from '../db/client'
import type { CrudResource } from './crud'
import { conflict, notFound } from './errors'
import { initialLastDate, MONTHLY, toRule } from './schedule'
import { assertCompteOwned, compteScope, getCurrentUserId } from './scope'
import { boolish, numeric, numericInt, numericOneOf } from './validate'

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

// Banques partagées : lecture et création seules. Renommer, fusionner ou supprimer se fait en base par l'exploitant.
export const banqueResource: CrudResource = {
  path: 'banques', label: 'Banque', table: banques, pk: 'IDbanque',
  actions: ['list', 'count', 'get', 'create'],
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

type ApiEvent = Parameters<typeof getCurrentUserId>[0]

const assertCompteInBody = async (event: ApiEvent, data: Record<string, any>) => {
  if (data.IDcompte !== undefined) await assertCompteOwned(event, data.IDcompte)
}

// IDcredit : null/absent, ou un crédit de l'utilisateur.
const assertCreditInBody = async (event: ApiEvent, data: Record<string, any>) => {
  if (!data.IDcredit) return
  const [credit] = await getDb().select({ id: credits.IDcredit }).from(credits)
    .where(and(eq(credits.IDcredit, data.IDcredit), eq(credits.IDuser, userId(event)))).limit(1)
  if (!credit) throw notFound(`Credit ${data.IDcredit} not found`)
}

// IDcat : 0 (sans catégorie), une catégorie partagée (IDuser = 0) ou une catégorie de l'utilisateur.
export const assertCategorieInBody = async (event: ApiEvent, data: Record<string, any>) => {
  if (!data.IDcat) return
  const [categorie] = await getDb().select({ id: categories.IDcat }).from(categories)
    .where(and(eq(categories.IDcat, data.IDcat), inArray(categories.IDuser, [0, userId(event)]))).limit(1)
  if (!categorie) throw notFound(`Categorie ${data.IDcat} not found`)
}

const assertReferencesOwned = (...checks: ((event: ApiEvent, data: Record<string, any>) => Promise<void>)[]) =>
  async (event: ApiEvent, data: Record<string, any>) => {
    for (const check of checks) await check(event, data)
  }

export const operationResource: CrudResource = {
  path: 'operations', label: 'Operation', table: operations, pk: 'IDop',
  readScope: event => compteScope(event, operations.IDcompte),
  defaults: { CheckOp: false, IDcat: 0, amortissement: false },
  validate: assertReferencesOwned(assertCompteInBody, assertCreditInBody, assertCategorieInBody),
  ...shape(
    { NomOp: str, MontantOp: numeric, DateOp: date, IDcompte: numeric },
    { CheckOp: boolish, IDcat: numeric, amortissement: boolish, IDcredit: numeric.nullable() }
  )
}

export const operationRecurrenteResource: CrudResource = {
  path: 'operation-recurrentes', label: 'OperationRecurrente', table: operationRecurrentes, pk: 'IDopRecu',
  readScope: event => compteScope(event, operationRecurrentes.IDcompte),
  // MoisOpRecu est indexé à partir de 0 (janvier)
  defaults: { JourNumOpRecu: 1, MoisOpRecu: 0, Frequence: MONTHLY, IDcat: 0 },
  validate: assertReferencesOwned(assertCompteInBody, assertCategorieInBody),
  // IDcredit n'est posé que par le serveur (création d'un crédit) : seul null est accepté dans le corps.
  // DernierDateOpRecu est ignoré à la création (fixé par le serveur) et conservé par un PUT qui l'omet.
  ...shape(
    { NomOpRecu: str, MontantOpRecu: numeric, JourOpRecu: numeric, IDcompte: numeric },
    {
      DernierDateOpRecu: date, JourNumOpRecu: numericInt(1, 31), MoisOpRecu: numericInt(0, 11),
      Frequence: numericOneOf(3, 7), IDcat: numeric, IDcredit: z.null()
    }
  ),
  // La première échéance à venir doit être générée : DernierDateOpRecu = échéance qui la précède
  onCreate: async (_event, data, tx) => {
    const values = { ...data, IDcredit: null, DernierDateOpRecu: initialLastDate(toRule(data), new Date()) }
    const [result] = await tx.insert(operationRecurrentes).values(values as never)
    return { ...values, IDopRecu: (result as unknown as { insertId: number }).insertId }
  },
  // Une récurrente de crédit est gérée par son crédit (lecture seule ici)
  assertWritable: (existing) => {
    if (existing.IDcredit) {
      throw conflict(`Recurring operation ${existing.IDopRecu} is managed by credit ${existing.IDcredit}`)
    }
  },
  bulkScope: () => isNull(operationRecurrentes.IDcredit)
}

// Récurrente de mensualité d'un crédit : par IDopRecu, sinon par IDcredit (lien IDopRecu historique cassé)
const findMensualite = async (tx: Parameters<NonNullable<CrudResource['onUpdate']>>[3], credit: Record<string, any>) => {
  if (credit.IDopRecu) {
    const [byId] = await tx.select().from(operationRecurrentes).where(eq(operationRecurrentes.IDopRecu, credit.IDopRecu)).limit(1)
    if (byId) return byId
  }
  const [byCredit] = await tx.select().from(operationRecurrentes).where(eq(operationRecurrentes.IDcredit, credit.IDcredit)).limit(1)
  return byCredit
}

const mensualiteRule = (debut: Date) => ({ Frequence: MONTHLY, JourNumOpRecu: debut.getUTCDate(), MoisOpRecu: debut.getUTCMonth() })

export const creditResource: CrudResource = {
  path: 'credits', label: 'Credit', table: credits, pk: 'IDcredit',
  // Pas de PATCH en masse : la propagation vers la récurrente n'a pas de sens sur une sélection
  actions: ['list', 'count', 'get', 'create', 'patchById', 'replaceById', 'deleteById'],
  readScope: event => eq(credits.IDuser, userId(event)),
  forced: event => ({ IDuser: userId(event) }),
  defaults: { Statut: 'actif', IDcat: 0 },
  // IDopRecu est un lien géré par le serveur (récurrente de mensualité)
  preserve: ['IDopRecu'],
  validate: assertReferencesOwned(assertCompteInBody, assertCategorieInBody),
  ...shape(
    { NomCredit: str, MontantInitial: numeric, MontantMensuel: numeric, DateDebut: date, DateFin: date, IDcompte: numeric },
    { NomPreteur: str.nullable(), TauxInteret: numeric.nullable(), Statut: str, IDcat: numeric }
  ),
  // Création du crédit + de sa récurrente mensuelle. Credit est en InnoDB mais OperationRecurrente peut être
  // en MyISAM (non transactionnelle) : en cas d'échec, la récurrente est supprimée explicitement.
  onCreate: async (_event, data, tx) => {
    const [created] = await tx.insert(credits).values(data as never)
    const creditId = (created as unknown as { insertId: number }).insertId
    const debut = data.DateDebut as Date
    const rule = mensualiteRule(debut)
    const [recu] = await tx.insert(operationRecurrentes).values({
      NomOpRecu: `Mensualité ${data.NomCredit}`,
      MontantOpRecu: data.MontantMensuel,
      JourOpRecu: 1,
      ...rule,
      // Première mensualité = première échéance ≥ max(aujourd'hui, DateDebut) : aucun rattrapage rétroactif
      DernierDateOpRecu: initialLastDate(rule, debut, new Date()),
      IDcompte: data.IDcompte,
      IDcat: data.IDcat || 0,
      IDcredit: creditId
    })
    const recuId = (recu as unknown as { insertId: number }).insertId
    try {
      await tx.update(credits).set({ IDopRecu: recuId }).where(eq(credits.IDcredit, creditId))
      const [row] = await tx.select().from(credits).where(eq(credits.IDcredit, creditId)).limit(1)
      return row as Record<string, any>
    } catch (error) {
      await tx.delete(operationRecurrentes).where(eq(operationRecurrentes.IDopRecu, recuId))
      throw error
    }
  },
  // Propagation vers la récurrente de mensualité (les opérations déjà générées ne changent pas)
  // Seuls les champs modifiés sont propagés : la mensualité peut tomber un autre jour que DateDebut
  // (date de signature), et ce jour n'est réécrit que si DateDebut change.
  onUpdate: async (_event, before, after, tx) => {
    const recu = await findMensualite(tx, after)
    if (!recu) return
    const changed = (name: string) => {
      const a = before[name]
      const b = after[name]
      return a instanceof Date && b instanceof Date ? a.getTime() !== b.getTime() : a !== b
    }
    const values: Record<string, unknown> = {}
    if (changed('NomCredit')) values.NomOpRecu = `Mensualité ${after.NomCredit}`
    if (changed('MontantMensuel')) values.MontantOpRecu = after.MontantMensuel
    if (changed('IDcompte')) values.IDcompte = after.IDcompte
    if (changed('IDcat')) values.IDcat = after.IDcat || 0
    if (changed('DateDebut')) {
      const debut = after.DateDebut as Date
      const rule = mensualiteRule(debut)
      values.JourNumOpRecu = rule.JourNumOpRecu
      values.MoisOpRecu = rule.MoisOpRecu
      // Report avant toute mensualité générée : l'échéancier repart de la nouvelle date
      if (recu.DernierDateOpRecu < (before.DateDebut as Date)) values.DernierDateOpRecu = initialLastDate(rule, debut, new Date())
    }
    if (!Object.keys(values).length) return
    await tx.update(operationRecurrentes).set(values as never).where(eq(operationRecurrentes.IDopRecu, recu.IDopRecu))
  },
  // La récurrente est supprimée avant le crédit : un échec intermédiaire ne laisse pas de récurrente active.
  // Par IDopRecu et par IDcredit : un lien IDopRecu historique peut pointer sur une récurrente disparue.
  onDelete: async (_event, existing, tx) => {
    await tx.delete(operationRecurrentes).where(or(
      eq(operationRecurrentes.IDcredit, existing.IDcredit),
      existing.IDopRecu ? eq(operationRecurrentes.IDopRecu, existing.IDopRecu) : undefined
    ))
    await tx.update(operations).set({ IDcredit: null }).where(eq(operations.IDcredit, existing.IDcredit))
  }
}

export const bienResource: CrudResource = {
  path: 'biens', label: 'Bien', table: biens, pk: 'IDbien',
  readScope: event => eq(biens.IDuser, userId(event)),
  forced: event => ({ IDuser: userId(event) }),
  defaults: { Usage: 'principale', FraisAgence: 0, ApportCash: 0 },
  validate: assertCreditInBody,
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
