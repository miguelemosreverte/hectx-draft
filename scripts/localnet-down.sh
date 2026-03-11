#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCALNET_DIR="$ROOT_DIR/vendor/splice/cluster/compose/localnet"

export LOCALNET_DIR
export LOCALNET_ENV_DIR="$LOCALNET_DIR/env"
export IMAGE_TAG=${IMAGE_TAG:-0.5.14}
export DOCKER_NETWORK=${DOCKER_NETWORK:-hectx-localnet}

cd "$LOCALNET_DIR"

docker compose \
  --env-file compose.env \
  -f compose.yaml \
  down -v --remove-orphans
