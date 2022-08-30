docker pull mccbng/api:staging
docker container stop $(docker container ls -q --filter name=api_prod)
docker run -d --rm -p 3001:3000 --name api_prod --mount type=bind,source=/docker/mccbng_api/latest/datasources.json,target=/usr/src/datasources/mccb-mysql.datasource.config.json mccbng/api:latest
