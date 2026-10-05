import {
  boolean, datetime, float, int, mysqlEnum, mysqlTable, varchar
} from 'drizzle-orm/mysql-core'

// Miroir du schéma de production (créé historiquement par l'auto-migration LoopBack) :
// noms de tables et de colonnes strictement identiques.
const str = (name: string) => varchar(name, { length: 512 })

// Production : clé primaire = IDuser, email varchar(255). La colonne historique `id` (non unique) existe encore en base
// mais n'est plus lue ni écrite par l'API : elle sera supprimée par une migration ultérieure.
export const users = mysqlTable('User', {
  IDuser: int('IDuser').primaryKey(),
  realm: str('realm'),
  username: str('username'),
  email: varchar('email', { length: 255 }).notNull().unique(),
  warningTotal: int('warningTotal'),
  warningCompte: int('warningCompte'),
  favoris: int('favoris'),
  secret_key: str('secret_key'),
  emailVerified: boolean('emailVerified'),
  verificationToken: str('verificationToken'),
  // Verrouillage temporaire après échecs de connexion consécutifs
  failedLoginCount: int('failedLoginCount').notNull().default(0),
  lockedUntil: datetime('lockedUntil', { mode: 'date' }),
  // Incrémenté au logout : invalide tous les JWT émis (claim `tv`)
  tokenVersion: int('tokenVersion').notNull().default(0)
})

export const userCredentials = mysqlTable('UserCredentials', {
  id: str('id').primaryKey(),
  password: str('password').notNull(),
  userId: str('userId').notNull()
})

export const banques = mysqlTable('Banque', {
  IDbanque: int('IDbanque').primaryKey().autoincrement(),
  NomBanque: str('NomBanque').notNull()
})

export const comptes = mysqlTable('Compte', {
  IDcompte: int('IDcompte').primaryKey().autoincrement(),
  NomCompte: str('NomCompte').notNull(),
  solde: float('solde').notNull(),
  IDuser: int('IDuser').notNull(),
  bloque: boolean('bloque').default(false),
  joint: boolean('joint').default(false),
  children: boolean('children').default(false),
  retraite: boolean('retraite').default(false),
  porte_feuille: boolean('porte_feuille').default(false),
  visible: boolean('visible').default(true),
  IDbanque: int('IDbanque')
})

export const operations = mysqlTable('Operation', {
  IDop: int('IDop').primaryKey().autoincrement(),
  NomOp: str('NomOp').notNull(),
  MontantOp: float('MontantOp').notNull(),
  DateOp: datetime('DateOp', { mode: 'date' }).notNull(),
  CheckOp: boolean('CheckOp').default(false),
  IDcompte: int('IDcompte').notNull(),
  IDcat: int('IDcat').default(0),
  amortissement: boolean('amortissement').default(false),
  IDcredit: int('IDcredit')
})

export const operationRecurrentes = mysqlTable('OperationRecurrente', {
  IDopRecu: int('IDopRecu').primaryKey().autoincrement(),
  NomOpRecu: str('NomOpRecu').notNull(),
  MontantOpRecu: float('MontantOpRecu').notNull(),
  JourOpRecu: int('JourOpRecu').notNull(),
  JourNumOpRecu: int('JourNumOpRecu').default(1),
  MoisOpRecu: int('MoisOpRecu').default(1),
  Frequence: int('Frequence').default(3),
  DernierDateOpRecu: datetime('DernierDateOpRecu', { mode: 'date' }).notNull(),
  IDcompte: int('IDcompte').notNull(),
  IDcat: int('IDcat').default(0),
  IDcredit: int('IDcredit')
})

export const categories = mysqlTable('Categorie', {
  IDcat: int('IDcat').primaryKey().autoincrement(),
  Nom: str('Nom').notNull(),
  IDuser: int('IDuser').notNull(),
  Type: mysqlEnum('Type', ['depense', 'revenu', 'transfert']).notNull().default('depense')
})

export const credits = mysqlTable('Credit', {
  IDcredit: int('IDcredit').primaryKey().autoincrement(),
  NomCredit: str('NomCredit').notNull(),
  NomPreteur: str('NomPreteur'),
  MontantInitial: float('MontantInitial').notNull(),
  MontantMensuel: float('MontantMensuel').notNull(),
  TauxInteret: float('TauxInteret'),
  DateDebut: datetime('DateDebut', { mode: 'date' }).notNull(),
  DateFin: datetime('DateFin', { mode: 'date' }).notNull(),
  IDcompte: int('IDcompte').notNull(),
  IDopRecu: int('IDopRecu'),
  IDuser: int('IDuser').notNull(),
  Statut: str('Statut').default('actif'),
  IDcat: int('IDcat').default(0)
})

export const biens = mysqlTable('Bien', {
  IDbien: int('IDbien').primaryKey().autoincrement(),
  NomBien: str('NomBien').notNull(),
  Ville: str('Ville').notNull(),
  TypeBien: str('TypeBien').notNull(),
  Surface: float('Surface'),
  Usage: str('Usage').notNull().default('principale'),
  DateAchat: datetime('DateAchat', { mode: 'date' }).notNull(),
  PrixBienNu: float('PrixBienNu').notNull(),
  FraisNotaire: float('FraisNotaire').notNull(),
  FraisAgence: float('FraisAgence').default(0),
  ApportCash: float('ApportCash').default(0),
  ValeurActuelle: float('ValeurActuelle'),
  IDcredit: int('IDcredit'),
  IDuser: int('IDuser').notNull()
})
