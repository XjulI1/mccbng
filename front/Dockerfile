# Contexte de build : racine du dépôt (le lockfile pnpm est à la racine du workspace)
#   docker build -f front/Dockerfile -t <image> .

# ---- Build ----
FROM node:26-slim AS build

# Node 26 n'embarque plus corepack : pnpm est installé à la version du champ packageManager du package.json racine
RUN npm install -g pnpm@10.33.0

WORKDIR /app

# Manifestes du workspace (couche mise en cache tant que les dépendances ne changent pas)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY back/package.json back/package.json
COPY front/package.json front/package.json

# --ignore-scripts : le postinstall (nuxt prepare) a besoin des sources, `nuxt build` le refait
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @mccbng/front...

# Sources du front
COPY front front

RUN pnpm --filter @mccbng/front build

# ---- Prod ----
FROM node:26-slim

WORKDIR /app

COPY --from=build /app/front/.output ./.output
COPY --from=build /app/front/docker-entrypoint.sh ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=8080
# Configuration lue à l'exécution (aucun secret dans l'image) :
#   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME  (MySQL, obligatoires)
#   JWT_SECRET (obligatoire), JWT_TTL_SECONDS (défaut 3600)
# Les migrations SQL (front/scripts/db-migrate.mjs) se lancent depuis le poste / la CI, pas depuis cette image.

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "docker-entrypoint.sh"]
