-- Import d'opérations en lot (extraction par LLM) : lots en brouillon puis validés.
-- Les lignes des lots validés sont conservées : elles servent de correspondances apprises (LibelleSource → NomOp).
CREATE TABLE IF NOT EXISTS `ImportLot` (
  `IDimport` int(11) NOT NULL AUTO_INCREMENT,
  `IDuser` int(11) NOT NULL,
  `IDcompte` int(11) NOT NULL,
  `Statut` enum('brouillon','valide','abandonne') NOT NULL DEFAULT 'brouillon',
  `Source` varchar(16) NOT NULL,
  `Modele` varchar(64) DEFAULT NULL,
  `TokensEntree` int(11) DEFAULT NULL,
  `TokensSortie` int(11) DEFAULT NULL,
  `DateCreation` datetime NOT NULL,
  `DateValidation` datetime DEFAULT NULL,
  PRIMARY KEY (`IDimport`),
  KEY `idx_importlot_iduser_statut` (`IDuser`, `Statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ImportLigne` (
  `IDligne` int(11) NOT NULL AUTO_INCREMENT,
  `IDimport` int(11) NOT NULL,
  `Ordre` int(11) NOT NULL DEFAULT 0,
  `DateOp` datetime NOT NULL,
  `LibelleSource` varchar(255) NOT NULL,
  `CleSource` varchar(255) NOT NULL,
  `NomOp` varchar(512) NOT NULL,
  `MontantOp` decimal(12,2) NOT NULL,
  `IDcat` int(11) NOT NULL DEFAULT 0,
  `Confiance` enum('haute','moyenne','faible') NOT NULL DEFAULT 'moyenne',
  `IDopDoublon` int(11) DEFAULT NULL,
  `DoublonLot` tinyint(1) NOT NULL DEFAULT 0,
  `Selection` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`IDligne`),
  KEY `idx_importligne_import_cle` (`IDimport`, `CleSource`),
  CONSTRAINT `fk_importligne_import` FOREIGN KEY (`IDimport`) REFERENCES `ImportLot` (`IDimport`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
