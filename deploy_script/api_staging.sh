docker pull mccbng/api:staging
docker container stop $(docker container ls -q --filter name=api_staging)
docker run -d --rm -p 3003:3000 --env NODE_ENV=development --name api_staging --mount type=bind,source=/docker/mccbng_api/staging/datasources.json,target=/usr/src/datasources/mccb-mysql.datasource.config.json mccbng/api:staging
