#!/usr/bin/env bash
# Deploys a fresh, always-unique version to Goldsky (it refuses to redeploy
# an existing name/version) and points the "current" tag at it -- so
# render.yaml's SUBGRAPH_URL (which targets /current/, not a fixed version)
# never needs updating on a future subgraph redeploy.
set -euo pipefail

VERSION=$(date +%Y.%m.%d%H%M%S)
goldsky subgraph deploy "duckfun-ink/${VERSION}" --path .
goldsky subgraph tag create "duckfun-ink/${VERSION}" --tag current
echo "Deployed and tagged duckfun-ink/${VERSION} as current"
