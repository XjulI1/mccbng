-- Migration: replace Categorie.Stats boolean with a Type ENUM
-- Date: 2026-05-07
--
-- The previous Stats flag conflated two distinct concepts:
--   1) "this is a transfer / not a real income or expense" (Virement, Remboursement…)
--   2) "this is a revenue, exclude it from the dépense-centric monthly total" (Salaire)
-- The new Type field separates them explicitly so each graph can choose what to show.

ALTER TABLE `Categorie`
  ADD COLUMN `Type` ENUM('depense','revenu','transfert') NOT NULL DEFAULT 'depense'
  AFTER `IDuser`;

-- Backfill: every category previously excluded from stats becomes a transfer.
UPDATE `Categorie` SET `Type` = 'transfert' WHERE `Stats` = 0;

-- Salaire is the only system-shared revenue category and was historically
-- excluded from stats only to avoid polluting the dépense-centric monthly sum.
UPDATE `Categorie` SET `Type` = 'revenu' WHERE `IDcat` = 1;

ALTER TABLE `Categorie` DROP COLUMN `Stats`;

-- Rollback:
-- ALTER TABLE `Categorie` ADD COLUMN `Stats` TINYINT(1) NOT NULL DEFAULT 1 AFTER `IDuser`;
-- UPDATE `Categorie` SET `Stats` = 0 WHERE `Type` = 'transfert';
-- UPDATE `Categorie` SET `Stats` = 0 WHERE `IDcat` = 1;
-- ALTER TABLE `Categorie` DROP COLUMN `Type`;
