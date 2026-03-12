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

if ! command -v hurl >/dev/null 2>&1; then
  echo "hurl is required but not found in PATH" >&2
  exit 1
fi

set -a
source "$ROOT_DIR/vendor/splice/cluster/compose/localnet/env/common.env"
set +a

cleanup() {
  if [[ -n "${DEMO_PID:-}" ]]; then
    kill "$DEMO_PID" >/dev/null 2>&1 || true
  fi
  "$ROOT_DIR/scripts/docker-env.sh" "$ROOT_DIR/scripts/localnet-down.sh" >/dev/null 2>&1 || true
}

trap cleanup EXIT

"$ROOT_DIR/scripts/docker-env.sh" "$ROOT_DIR/scripts/localnet-up.sh"

pushd "$ROOT_DIR/hectx-services" >/dev/null
npm install
npm run build
node dist/demo-server.js >/tmp/hectx-demo.log 2>&1 &
DEMO_PID=$!

for _ in $(seq 1 60); do
  if curl -s http://localhost:5177/api/status | grep -q '"ready":'; then
    break
  fi
  sleep 1
done

npm run test:demo
popd >/dev/null
