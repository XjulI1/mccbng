-- Sécurité du login (change harden-api-security) :
--   failedLoginCount / lockedUntil : verrouillage temporaire du compte après des échecs consécutifs
--   tokenVersion : révocation de tous les JWT d'un utilisateur au logout
-- Colonnes avec valeurs par défaut : l'ancienne image les ignore (rollback sans migration inverse).
ALTER TABLE `User`
  ADD COLUMN `failedLoginCount` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN `lockedUntil` datetime DEFAULT NULL,
  ADD COLUMN `tokenVersion` int(11) NOT NULL DEFAULT 0;
