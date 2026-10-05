// Charge le fichier .env de la racine du dépôt (comme Nuxt en développement) pour les scripts qui accèdent à la base.
// Les variables déjà définies dans l'environnement sont prioritaires : `DB_HOST=… node scripts/…` l'emporte sur .env.
// Un autre fichier peut être choisi avec ENV_FILE (ex. ENV_FILE=.env.production).
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Retourne le chemin du fichier chargé, ou undefined s'il n'existe pas. */
export const loadEnv = (file = process.env.ENV_FILE ?? '.env') => {
  const path = resolve(ROOT, file)
  if (!existsSync(path)) {
    if (process.env.ENV_FILE) throw new Error(`Fichier d'environnement introuvable : ${path}`)
    return undefined
  }
  process.loadEnvFile(path)
  return path
}
