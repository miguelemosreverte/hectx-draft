#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT_DIR/scripts/build-daml.sh"

cd "$ROOT_DIR/hectx-daml"
daml script --dar .daml/dist/hectx-0.1.0.dar --script-name HectX.Tests:main --ide-ledger
