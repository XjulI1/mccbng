-- Sécurité du login (change harden-api-security) :
--   failedLoginCount / lockedUntil : verrouillage temporaire du compte après des échecs consécutifs
--   tokenVersion : révocation de tous les JWT d'un utilisateur au logout
-- Colonnes avec valeurs par défaut : l'ancienne image les ignore (rollback sans migration inverse).
-- Rejouable (IF NOT EXISTS, syntaxe MariaDB).
ALTER TABLE `User`
  ADD COLUMN IF NOT EXISTS `failedLoginCount` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `lockedUntil` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `tokenVersion` int(11) NOT NULL DEFAULT 0;
