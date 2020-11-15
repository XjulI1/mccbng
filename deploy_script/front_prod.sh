docker pull xjuli1/mccbng_front_vue
docker container stop $(docker container ls -q --filter name=front_prod)
docker run -d --rm -p 3002:80 --name front_prod xjuli1/mccbng_front_vue
