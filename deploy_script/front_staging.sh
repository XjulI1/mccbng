docker pull xjuli1/mccbng_front_vue:staging
docker container stop $(docker container ls -q --filter name=front_staging)
docker run -d --rm -p 3004:80 --name front_staging xjuli1/mccbng_front_vue:staging
