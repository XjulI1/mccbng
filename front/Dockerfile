# ---- Build ----
FROM node:24-slim AS build

WORKDIR /app

# Install app dependencies
COPY package*.json ./

RUN yarn

# Bundle app source code
COPY . .

RUN yarn build

# ---- Prod ----
FROM nginx

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
