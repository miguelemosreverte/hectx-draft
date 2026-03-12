#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but not found in PATH" >&2
  exit 1
fi

if ! "$ROOT_DIR/scripts/docker-env.sh" docker info >/dev/null 2>&1; then
  echo "docker daemon is not running" >&2
  exit 1
fi

set -a
source "$ROOT_DIR/vendor/splice/cluster/compose/localnet/env/common.env"
set +a

"$ROOT_DIR/scripts/docker-env.sh" "$ROOT_DIR/scripts/localnet-up.sh"

pushd "$ROOT_DIR/hectx-services" >/dev/null
npm install
npm run build
node dist/demo-server.js
popd >/dev/null
