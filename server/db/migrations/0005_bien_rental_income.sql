ALTER TABLE `Operation`
  ADD COLUMN IF NOT EXISTS `IDbien` int(11) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS `idx_operation_idbien` ON `Operation` (`IDbien`);
ALTER TABLE `OperationRecurrente`
  ADD COLUMN IF NOT EXISTS `IDbien` int(11) DEFAULT NULL;
ALTER TABLE `Bien`
  ADD COLUMN IF NOT EXISTS `LoyerMensuel` decimal(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `AbattementCharges` decimal(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `DateMiseEnLocation` datetime DEFAULT NULL;
