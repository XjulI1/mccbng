# Contexte de build : racine du dépôt (le lockfile pnpm est à la racine du workspace)
#   docker build -f front/Dockerfile -t <image> .

# ---- Build ----
FROM node:22-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

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
FROM node:22-slim

WORKDIR /app

COPY --from=build /app/front/.output ./.output

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=8080
# API_URL (URL du back LoopBack, lue à l'exécution par le proxy /api) est OBLIGATOIRE au déploiement

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "if [ -z \"$API_URL\" ]; then echo 'ERREUR: la variable API_URL doit être définie (ex: http://api:3000)' >&2; exit 1; fi; exec node .output/server/index.mjs"]
