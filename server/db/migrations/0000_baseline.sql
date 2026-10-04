-- Baseline : schéma de PRODUCTION réel (extrait du dump phpMyAdmin, DDL uniquement, aucune donnée).
-- À noter : plusieurs tables sont en MyISAM (pas de transactions) et en utf8mb3 ; `User` a pour clé primaire `IDuser`.
-- Les défauts SQL ne sont pas ceux des modèles LoopBack (ex. Operation.IDcat sans défaut) : l'API applique ses défauts côté application.
-- En production ce fichier est marqué « joué » (db:migrate --baseline) sans être exécuté.

CREATE TABLE IF NOT EXISTS `Banque` (
  `IDbanque` int(11) NOT NULL,
  `NomBanque` varchar(512) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
CREATE TABLE IF NOT EXISTS `Bien` (
  `IDbien` int(11) NOT NULL,
  `NomBien` varchar(512) NOT NULL,
  `Ville` varchar(512) NOT NULL,
  `TypeBien` varchar(512) NOT NULL,
  `Surface` float DEFAULT NULL,
  `Usage` varchar(512) NOT NULL DEFAULT 'principale',
  `DateAchat` datetime NOT NULL,
  `PrixBienNu` float NOT NULL,
  `FraisNotaire` float NOT NULL,
  `FraisAgence` float DEFAULT 0,
  `ApportCash` float DEFAULT 0,
  `ValeurActuelle` float DEFAULT NULL,
  `IDcredit` int(11) DEFAULT NULL,
  `IDuser` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `Categorie` (
  `IDcat` int(5) NOT NULL,
  `Nom` varchar(512) NOT NULL,
  `IDuser` int(11) NOT NULL,
  `Type` enum('depense','revenu','transfert') NOT NULL DEFAULT 'depense'
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
CREATE TABLE IF NOT EXISTS `Compte` (
  `IDcompte` int(5) NOT NULL,
  `NomCompte` varchar(512) NOT NULL,
  `solde` float NOT NULL,
  `IDuser` int(11) NOT NULL,
  `bloque` tinyint(1) DEFAULT NULL,
  `porte_feuille` tinyint(1) DEFAULT NULL,
  `visible` tinyint(1) DEFAULT NULL,
  `IDbanque` int(11) DEFAULT NULL,
  `retraite` tinyint(1) DEFAULT NULL,
  `joint` tinyint(1) NOT NULL DEFAULT 0,
  `children` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
CREATE TABLE IF NOT EXISTS `Credit` (
  `IDcredit` int(11) NOT NULL,
  `NomCredit` varchar(512) NOT NULL,
  `NomPreteur` varchar(512) DEFAULT NULL,
  `MontantInitial` float NOT NULL,
  `MontantMensuel` float NOT NULL,
  `TauxInteret` float DEFAULT NULL,
  `DateDebut` datetime NOT NULL,
  `DateFin` datetime NOT NULL,
  `IDcompte` int(11) NOT NULL,
  `IDopRecu` int(11) DEFAULT NULL,
  `IDuser` int(11) NOT NULL,
  `Statut` varchar(512) DEFAULT NULL,
  `IDcat` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
CREATE TABLE IF NOT EXISTS `Operation` (
  `IDop` int(5) NOT NULL,
  `NomOp` varchar(512) NOT NULL,
  `MontantOp` float NOT NULL,
  `DateOp` datetime NOT NULL,
  `CheckOp` tinyint(1) NOT NULL DEFAULT 0,
  `IDcompte` int(11) NOT NULL,
  `IDcat` int(11) DEFAULT NULL,
  `amortissement` tinyint(1) NOT NULL DEFAULT 0,
  `IDcredit` int(11) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
CREATE TABLE IF NOT EXISTS `OperationRecurrente` (
  `IDopRecu` int(5) NOT NULL,
  `NomOpRecu` varchar(512) NOT NULL,
  `MontantOpRecu` float NOT NULL,
  `JourOpRecu` int(11) NOT NULL,
  `JourNumOpRecu` int(11) DEFAULT NULL,
  `MoisOpRecu` int(11) DEFAULT NULL,
  `Frequence` int(11) DEFAULT NULL,
  `DernierDateOpRecu` datetime NOT NULL,
  `IDcompte` int(11) NOT NULL,
  `IDcat` int(11) DEFAULT NULL,
  `IDcredit` int(11) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
CREATE TABLE IF NOT EXISTS `Stats` (
  `userID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
CREATE TABLE IF NOT EXISTS `User` (
  `email` varchar(255) NOT NULL,
  `IDuser` int(11) NOT NULL,
  `warningTotal` int(11) DEFAULT NULL,
  `warningCompte` int(11) DEFAULT NULL,
  `favoris` int(11) DEFAULT NULL,
  `realm` varchar(512) DEFAULT NULL,
  `username` varchar(512) DEFAULT NULL,
  `emailVerified` tinyint(1) DEFAULT NULL,
  `verificationToken` varchar(512) DEFAULT NULL,
  `id` varchar(128) NOT NULL,
  `secret_key` varchar(512) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
CREATE TABLE IF NOT EXISTS `UserCredentials` (
  `id` varchar(255) NOT NULL,
  `password` varchar(512) NOT NULL,
  `userId` varchar(512) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
ALTER TABLE `Banque`
  ADD PRIMARY KEY (`IDbanque`);
ALTER TABLE `Bien`
  ADD PRIMARY KEY (`IDbien`),
  ADD KEY `idx_bien_iduser` (`IDuser`),
  ADD KEY `idx_bien_idcredit` (`IDcredit`);
ALTER TABLE `Categorie`
  ADD PRIMARY KEY (`IDcat`);
ALTER TABLE `Compte`
  ADD PRIMARY KEY (`IDcompte`);
ALTER TABLE `Credit`
  ADD PRIMARY KEY (`IDcredit`);
ALTER TABLE `Operation`
  ADD PRIMARY KEY (`IDop`);
ALTER TABLE `OperationRecurrente`
  ADD PRIMARY KEY (`IDopRecu`),
  ADD UNIQUE KEY `IDopRecu` (`IDopRecu`);
ALTER TABLE `Stats`
  ADD PRIMARY KEY (`userID`);
ALTER TABLE `User`
  ADD PRIMARY KEY (`IDuser`),
  ADD UNIQUE KEY `email` (`email`);
ALTER TABLE `UserCredentials`
  ADD PRIMARY KEY (`id`);
ALTER TABLE `Banque`
  MODIFY `IDbanque` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `Bien`
  MODIFY `IDbien` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `Categorie`
  MODIFY `IDcat` int(5) NOT NULL AUTO_INCREMENT;
ALTER TABLE `Compte`
  MODIFY `IDcompte` int(5) NOT NULL AUTO_INCREMENT;
ALTER TABLE `Credit`
  MODIFY `IDcredit` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `Operation`
  MODIFY `IDop` int(5) NOT NULL AUTO_INCREMENT;
ALTER TABLE `OperationRecurrente`
  MODIFY `IDopRecu` int(5) NOT NULL AUTO_INCREMENT;
