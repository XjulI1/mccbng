-- Plus aucune colonne FLOAT (change harden-db-schema-and-cleanup) : un FLOAT n'a que ~7 chiffres significatifs,
-- 150 000,01 était relu 150 000,02. Les montants passent en DECIMAL(12,2), le taux (en %) en DECIMAL(6,3), la surface (m²)
-- en DECIMAL(8,2). Nullabilité et défauts conservés. Les valeurs existantes sont arrondies à l'échelle de la colonne.
-- L'API lit les DECIMAL comme des nombres (mysql2 decimalNumbers, Drizzle decimal mode 'number').
-- Rejouable : MODIFY vers le même type est sans effet.
-- Avant la production : comparer les sommes par compte avant / après sur une copie (docs/db-migrations.md).

ALTER TABLE `Operation`
  MODIFY `MontantOp` decimal(12,2) NOT NULL;
ALTER TABLE `OperationRecurrente`
  MODIFY `MontantOpRecu` decimal(12,2) NOT NULL;
ALTER TABLE `Compte`
  MODIFY `solde` decimal(12,2) NOT NULL;
ALTER TABLE `Credit`
  MODIFY `MontantInitial` decimal(12,2) NOT NULL,
  MODIFY `MontantMensuel` decimal(12,2) NOT NULL,
  MODIFY `TauxInteret` decimal(6,3) DEFAULT NULL;
ALTER TABLE `Bien`
  MODIFY `Surface` decimal(8,2) DEFAULT NULL,
  MODIFY `PrixBienNu` decimal(12,2) NOT NULL,
  MODIFY `FraisNotaire` decimal(12,2) NOT NULL,
  MODIFY `FraisAgence` decimal(12,2) DEFAULT 0,
  MODIFY `ApportCash` decimal(12,2) DEFAULT 0,
  MODIFY `ValeurActuelle` decimal(12,2) DEFAULT NULL;
