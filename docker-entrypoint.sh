#!/bin/sh
# Refuse de démarrer si la configuration obligatoire est absente (le serveur refait une vérification fine).
for name in NUXT_DB_HOST NUXT_DB_USER NUXT_DB_PASSWORD NUXT_DB_NAME NUXT_JWT_SECRET; do
  eval "value=\${$name}"
  if [ -z "$value" ]; then
    echo "ERREUR: la variable $name doit être définie" >&2
    exit 1
  fi
done
exec node .output/server/index.mjs
