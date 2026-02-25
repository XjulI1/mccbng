#!/bin/sh
set -e

# -------------------------------------------------------
# Build & Push script for mccbng front and back images.
# Runs inside a Docker container with access to a Docker
# daemon (via socket mount or DinD).
# -------------------------------------------------------

REGISTRY="${REGISTRY:-dockregistry.xju.fr/mccbng}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
GIT_REPO="${GIT_REPO:-https://github.com/XjulI1/mccbng.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"

echo "============================================"
echo " mccbng - Build & Push"
echo "============================================"
echo " Registry : ${REGISTRY}"
echo " Tag      : ${IMAGE_TAG}"
echo " Repo     : ${GIT_REPO}"
echo " Branch   : ${GIT_BRANCH}"
echo "============================================"

# Install git (Alpine-based docker:cli image)
apk add --no-cache git > /dev/null 2>&1

# Clone the repository
WORK_DIR=$(mktemp -d)
echo ""
echo "=> Cloning repository..."
git clone --branch "${GIT_BRANCH}" --depth 1 "${GIT_REPO}" "${WORK_DIR}"

# Build front image
echo ""
echo "=> Building front image: ${REGISTRY}/front:${IMAGE_TAG}"
docker build -t "${REGISTRY}/front:${IMAGE_TAG}" "${WORK_DIR}/front"

# Create a dummy datasource config for the build (gitignored, removed during Docker build)
cat > "${WORK_DIR}/back/src/datasources/mccb-mysql.datasource.config.json" <<'DSCFG'
{
  "name": "mccb_mysql",
  "connector": "mysql",
  "url": "",
  "host": "",
  "port": 3306,
  "user": "",
  "password": "",
  "database": ""
}
DSCFG

# Build back (api) image
echo ""
echo "=> Building api image: ${REGISTRY}/api:${IMAGE_TAG}"
docker build -t "${REGISTRY}/api:${IMAGE_TAG}" "${WORK_DIR}/back"

# Push images to registry
echo ""
echo "=> Pushing ${REGISTRY}/front:${IMAGE_TAG}"
docker push "${REGISTRY}/front:${IMAGE_TAG}"

echo ""
echo "=> Pushing ${REGISTRY}/api:${IMAGE_TAG}"
docker push "${REGISTRY}/api:${IMAGE_TAG}"

# Cleanup
rm -rf "${WORK_DIR}"

echo ""
echo "============================================"
echo " Done!"
echo "  - ${REGISTRY}/front:${IMAGE_TAG}"
echo "  - ${REGISTRY}/api:${IMAGE_TAG}"
echo "============================================"
