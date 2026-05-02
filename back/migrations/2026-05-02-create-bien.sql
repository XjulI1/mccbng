-- Migration: create Bien table for real estate property management
-- Date: 2026-05-02

CREATE TABLE IF NOT EXISTS `Bien` (
  `IDbien` INT NOT NULL AUTO_INCREMENT,
  `NomBien` VARCHAR(512) NOT NULL,
  `Ville` VARCHAR(512) NOT NULL,
  `TypeBien` VARCHAR(512) NOT NULL,
  `Surface` FLOAT NULL DEFAULT NULL,
  `Usage` VARCHAR(512) NOT NULL DEFAULT 'principale',
  `DateAchat` DATETIME NOT NULL,
  `PrixBienNu` FLOAT NOT NULL,
  `FraisNotaire` FLOAT NOT NULL,
  `FraisAgence` FLOAT NULL DEFAULT 0,
  `ApportCash` FLOAT NULL DEFAULT 0,
  `ValeurActuelle` FLOAT NULL DEFAULT NULL,
  `IDcredit` INT NULL DEFAULT NULL,
  `IDuser` INT NOT NULL,
  PRIMARY KEY (`IDbien`),
  KEY `idx_bien_iduser` (`IDuser`),
  KEY `idx_bien_idcredit` (`IDcredit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rollback:
-- DROP TABLE IF EXISTS `Bien`;
