# ---- Build ----
FROM node:22-slim AS builder

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json yarn.lock ./
COPY back/package.json ./back/
COPY front/package.json ./front/
COPY vue-touch-events/ ./vue-touch-events/

RUN yarn install --frozen-lockfile

# Copy front source after deps are installed
COPY front/ ./front/

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app/front
RUN yarn build:staging

# ---- Prod ----
FROM nginx

COPY --from=builder /app/front/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/front/dist /usr/share/nginx/html
