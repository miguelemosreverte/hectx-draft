#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCALNET_DIR="$ROOT_DIR/vendor/splice/cluster/compose/localnet"

export LOCALNET_DIR
export LOCALNET_ENV_DIR="$LOCALNET_DIR/env"
export IMAGE_TAG=${IMAGE_TAG:-0.5.14}
export DOCKER_NETWORK=${DOCKER_NETWORK:-hectx-localnet}
export PARTY_HINT=${PARTY_HINT:-hectx-localparty-1}

cd "$LOCALNET_DIR"

set -a
set +u
source "$LOCALNET_ENV_DIR/common.env"
set -u
set +a

docker compose \
  --env-file compose.env \
  -f compose.yaml \
  --profile app-user \
  --profile app-provider \
  --profile sv \
  up -d
