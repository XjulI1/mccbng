docker pull xjuli1/mccbng_api
docker run -d --rm -p 3001:3001 --mount type=bind,source=/home/ubuntu/mccbng/back_loopback/server/datasources.json,target=/usr/src/app/server/datasources.json xjuli1/mccbng_api
