FROM node:12-alpine

WORKDIR /usr/src/app

COPY package.json ./

RUN yarn install --prod

COPY . .

EXPOSE 3001

ENV NODE_ENV=production

CMD [ "node", "." ]
