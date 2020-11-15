docker pull xjuli1/mccbng_api:staging
docker container stop $(docker container ls -q --filter name=api_staging)
docker run -d --rm -p 3003:3001 --env NODE_ENV=development --name api_staging --mount type=bind,source=/home/ubuntu/mccbng/datasources-staging.json,target=/usr/src/app/server/datasources.json xjuli1/mccbng_api:staging
