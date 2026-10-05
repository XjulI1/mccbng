import {
  boolean, datetime, decimal, index, int, mysqlEnum, mysqlTable, varchar
} from 'drizzle-orm/mysql-core'

// Miroir du schéma de production (créé historiquement par l'auto-migration LoopBack) :
// noms de tables et de colonnes strictement identiques. Types, nullabilité et index suivent les migrations (server/db/migrations) ;
// les `.default()` sont des défauts APPLICATIFS (appliqués par Drizzle à l'insertion), qui peuvent différer des défauts SQL.
const str = (name: string) => varchar(name, { length: 512 })
// Montants : DECIMAL(12,2) lu comme un nombre (exact en double jusqu'à 10¹⁰)
const money = (name: string) => decimal(name, { precision: 12, scale: 2, mode: 'number' })

// Production : clé primaire = IDuser (non auto-incrémentée), email varchar(255). Colonnes LoopBack supprimées par 0004_drop_legacy.
export const users = mysqlTable('User', {
  IDuser: int('IDuser').primaryKey(),
  username: str('username'),
  email: varchar('email', { length: 255 }).notNull().unique(),
  warningTotal: int('warningTotal'),
  warningCompte: int('warningCompte'),
  favoris: int('favoris'),
  secret_key: str('secret_key'),
  // Verrouillage temporaire après échecs de connexion consécutifs
  failedLoginCount: int('failedLoginCount').notNull().default(0),
  lockedUntil: datetime('lockedUntil', { mode: 'date' }),
  // Incrémenté au logout : invalide tous les JWT émis (claim `tv`)
  tokenVersion: int('tokenVersion').notNull().default(0)
})

export const banques = mysqlTable('Banque', {
  IDbanque: int('IDbanque').primaryKey().autoincrement(),
  NomBanque: str('NomBanque').notNull()
})

export const comptes = mysqlTable('Compte', {
  IDcompte: int('IDcompte').primaryKey().autoincrement(),
  NomCompte: str('NomCompte').notNull(),
  solde: money('solde').notNull(),
  IDuser: int('IDuser').notNull(),
  bloque: boolean('bloque').notNull().default(false),
  joint: boolean('joint').notNull().default(false),
  children: boolean('children').notNull().default(false),
  retraite: boolean('retraite').notNull().default(false),
  porte_feuille: boolean('porte_feuille').notNull().default(false),
  visible: boolean('visible').notNull().default(true),
  IDbanque: int('IDbanque')
}, t => [index('idx_compte_iduser').on(t.IDuser)])

export const operations = mysqlTable('Operation', {
  IDop: int('IDop').primaryKey().autoincrement(),
  NomOp: str('NomOp').notNull(),
  MontantOp: money('MontantOp').notNull(),
  DateOp: datetime('DateOp', { mode: 'date' }).notNull(),
  CheckOp: boolean('CheckOp').notNull().default(false),
  IDcompte: int('IDcompte').notNull(),
  IDcat: int('IDcat').default(0),
  amortissement: boolean('amortissement').notNull().default(false),
  IDcredit: int('IDcredit')
}, t => [
  index('idx_operation_compte_check_date').on(t.IDcompte, t.CheckOp, t.DateOp),
  index('idx_operation_compte_date').on(t.IDcompte, t.DateOp),
  index('idx_operation_idcredit').on(t.IDcredit),
  index('idx_operation_idcat').on(t.IDcat)
])

export const operationRecurrentes = mysqlTable('OperationRecurrente', {
  IDopRecu: int('IDopRecu').primaryKey().autoincrement(),
  NomOpRecu: str('NomOpRecu').notNull(),
  MontantOpRecu: money('MontantOpRecu').notNull(),
  JourOpRecu: int('JourOpRecu').notNull(),
  JourNumOpRecu: int('JourNumOpRecu').default(1),
  MoisOpRecu: int('MoisOpRecu').default(1),
  Frequence: int('Frequence').default(3),
  DernierDateOpRecu: datetime('DernierDateOpRecu', { mode: 'date' }).notNull(),
  IDcompte: int('IDcompte').notNull(),
  IDcat: int('IDcat').default(0),
  IDcredit: int('IDcredit')
}, t => [index('idx_operationrecurrente_idcompte').on(t.IDcompte)])

export const categories = mysqlTable('Categorie', {
  IDcat: int('IDcat').primaryKey().autoincrement(),
  Nom: str('Nom').notNull(),
  IDuser: int('IDuser').notNull(),
  Type: mysqlEnum('Type', ['depense', 'revenu', 'transfert']).notNull().default('depense')
}, t => [index('idx_categorie_iduser').on(t.IDuser)])

export const credits = mysqlTable('Credit', {
  IDcredit: int('IDcredit').primaryKey().autoincrement(),
  NomCredit: str('NomCredit').notNull(),
  NomPreteur: str('NomPreteur'),
  MontantInitial: money('MontantInitial').notNull(),
  MontantMensuel: money('MontantMensuel').notNull(),
  // Taux annuel en %
  TauxInteret: decimal('TauxInteret', { precision: 6, scale: 3, mode: 'number' }),
  DateDebut: datetime('DateDebut', { mode: 'date' }).notNull(),
  DateFin: datetime('DateFin', { mode: 'date' }).notNull(),
  IDcompte: int('IDcompte').notNull(),
  IDopRecu: int('IDopRecu'),
  IDuser: int('IDuser').notNull(),
  Statut: str('Statut').default('actif'),
  IDcat: int('IDcat').default(0)
}, t => [index('idx_credit_iduser').on(t.IDuser)])

export const biens = mysqlTable('Bien', {
  IDbien: int('IDbien').primaryKey().autoincrement(),
  NomBien: str('NomBien').notNull(),
  Ville: str('Ville').notNull(),
  TypeBien: str('TypeBien').notNull(),
  // m²
  Surface: decimal('Surface', { precision: 8, scale: 2, mode: 'number' }),
  Usage: str('Usage').notNull().default('principale'),
  DateAchat: datetime('DateAchat', { mode: 'date' }).notNull(),
  PrixBienNu: money('PrixBienNu').notNull(),
  FraisNotaire: money('FraisNotaire').notNull(),
  FraisAgence: money('FraisAgence').default(0),
  ApportCash: money('ApportCash').default(0),
  ValeurActuelle: money('ValeurActuelle'),
  IDcredit: int('IDcredit'),
  IDuser: int('IDuser').notNull()
}, t => [
  index('idx_bien_iduser').on(t.IDuser),
  index('idx_bien_idcredit').on(t.IDcredit)
])
