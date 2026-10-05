-- Suppression du schéma legacy LoopBack (change harden-db-schema-and-cleanup), qu'aucun code ne lit ni n'écrit :
--   Stats (vide), UserCredentials (vide, remplacée par User.secret_key), User.id (ancien identifiant, non unique),
--   User.realm, User.emailVerified, User.verificationToken.
-- Destructif : la sauvegarde de la fenêtre de maintenance conserve ces données. L'image précédente ne fonctionne plus
-- après cette migration (rollback = restauration de la sauvegarde).
-- Rejouable : IF EXISTS (MariaDB).

DROP TABLE IF EXISTS `Stats`;
DROP TABLE IF EXISTS `UserCredentials`;
ALTER TABLE `User`
  DROP COLUMN IF EXISTS `id`,
  DROP COLUMN IF EXISTS `realm`,
  DROP COLUMN IF EXISTS `emailVerified`,
  DROP COLUMN IF EXISTS `verificationToken`;
