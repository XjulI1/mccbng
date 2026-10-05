-- Normalisation du schéma (change harden-db-schema-and-cleanup) :
--   InnoDB partout (transactions effectives), utf8mb4 / utf8mb4_unicode_ci (emoji), drapeaux de compte NOT NULL,
--   suppression de la clé UNIQUE redondante IDopRecu, index secondaires.
-- Rejouable : ENGINE / CONVERT / MODIFY / UPDATE … IS NULL sont idempotents, les index utilisent IF [NOT] EXISTS (MariaDB).
-- Avant la production : contrôler l'absence de collision d'email sous la nouvelle collation (docs/db-migrations.md).

-- La copie de table d'un ALTER ne doit pas renuméroter les clés AUTO_INCREMENT à 0 (IDcat = 0 « Aucune », IDbanque = 0).
-- Le runner l'impose déjà ; rappelé ici pour une exécution manuelle.
SET SESSION sql_mode = CONCAT_WS(',', NULLIF(@@SESSION.sql_mode, ''), 'NO_AUTO_VALUE_ON_ZERO');

-- Drapeaux de compte : valeurs NULL remplacées par leur défaut avant le passage en NOT NULL
UPDATE `Compte` SET `bloque` = 0 WHERE `bloque` IS NULL;
UPDATE `Compte` SET `porte_feuille` = 0 WHERE `porte_feuille` IS NULL;
UPDATE `Compte` SET `retraite` = 0 WHERE `retraite` IS NULL;
UPDATE `Compte` SET `visible` = 1 WHERE `visible` IS NULL;

ALTER TABLE `Banque`
  ENGINE = InnoDB, CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `Categorie`
  ENGINE = InnoDB, CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `Compte`
  ENGINE = InnoDB, CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY `bloque` tinyint(1) NOT NULL DEFAULT 0,
  MODIFY `porte_feuille` tinyint(1) NOT NULL DEFAULT 0,
  MODIFY `visible` tinyint(1) NOT NULL DEFAULT 1,
  MODIFY `retraite` tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE `Credit`
  ENGINE = InnoDB, CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `Operation`
  ENGINE = InnoDB, CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `OperationRecurrente`
  ENGINE = InnoDB, CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `User`
  ENGINE = InnoDB, CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Doublon de la clé primaire
DROP INDEX IF EXISTS `IDopRecu` ON `OperationRecurrente`;

-- Liste paginée d'un compte (CheckOp ASC, DateOp DESC) et soldes pointés / non pointés
CREATE INDEX IF NOT EXISTS `idx_operation_compte_check_date` ON `Operation` (`IDcompte`, `CheckOp`, `DateOp`);
-- Stats et totaux mensuels (plage de dates par compte), date de dernière opération
CREATE INDEX IF NOT EXISTS `idx_operation_compte_date` ON `Operation` (`IDcompte`, `DateOp`);
CREATE INDEX IF NOT EXISTS `idx_operation_idcredit` ON `Operation` (`IDcredit`);
CREATE INDEX IF NOT EXISTS `idx_operation_idcat` ON `Operation` (`IDcat`);
CREATE INDEX IF NOT EXISTS `idx_compte_iduser` ON `Compte` (`IDuser`);
CREATE INDEX IF NOT EXISTS `idx_operationrecurrente_idcompte` ON `OperationRecurrente` (`IDcompte`);
CREATE INDEX IF NOT EXISTS `idx_categorie_iduser` ON `Categorie` (`IDuser`);
CREATE INDEX IF NOT EXISTS `idx_credit_iduser` ON `Credit` (`IDuser`);
