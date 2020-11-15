docker pull xjuli1/mccbng_api
docker container stop $(docker container ls -q --filter name=api_prod)
docker run -d --rm -p 3001:3001 --name api_prod --mount type=bind,source=/home/ubuntu/mccbng/datasources.json,target=/usr/src/app/server/datasources.json xjuli1/mccbng_api
