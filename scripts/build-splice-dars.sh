#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SPLICE_TS_DIR="$ROOT_DIR/vendor/splice/token-standard"

packages=(
  "splice-api-token-metadata-v1"
  "splice-api-token-holding-v1"
  "splice-api-token-transfer-instruction-v1"
)

for pkg in "${packages[@]}"; do
  echo "Building $pkg"
  (cd "$SPLICE_TS_DIR/$pkg" && daml build)
  dist_dir="$SPLICE_TS_DIR/$pkg/.daml/dist"
  dar_name="$(ls -1 "$dist_dir"/*.dar | head -n 1)"
  if [ -f "$dar_name" ]; then
    base="$(basename "$dar_name")"
    current_name="${base%-*.dar}-current.dar"
    cp -f "$dar_name" "$dist_dir/$current_name"
  fi
done
