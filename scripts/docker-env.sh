#!/usr/bin/env bash
set -euo pipefail

if [[ -S "$HOME/.colima/docker.sock" ]]; then
  export DOCKER_HOST="unix://$HOME/.colima/docker.sock"
fi

exec "$@"
