-- Migration: widen User.secret_key to fit a bcrypt hash (60 chars).
-- Date: 2026-05-02
--
-- Previously secret_key stored a 6-character cleartext code. After this
-- migration it stores a bcrypt hash (60 chars). Run the companion Node
-- script `dist/migrations/hash-secret-keys.js` AFTER this ALTER to rewrite
-- all existing rows with their hashed value.
--
-- Order:
--   1. ALTER TABLE (this file).
--   2. node dist/migrations/hash-secret-keys.js  (hashes the existing values).
--   3. Deploy the new application code.

ALTER TABLE `User`
  MODIFY COLUMN `secret_key` VARCHAR(60) NULL DEFAULT NULL;

-- Rollback (DESTROYS all user codes — keep a backup first):
-- ALTER TABLE `User` MODIFY COLUMN `secret_key` VARCHAR(255) NULL DEFAULT NULL;
