#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

if command -v pnpm >/dev/null 2>&1; then
  RUNNER=(pnpm)
elif command -v corepack >/dev/null 2>&1; then
  RUNNER=(corepack pnpm)
else
  echo "pnpm is not installed and corepack is unavailable." >&2
  exit 1
fi

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "${WEB_PID:-}" ]]; then
    kill "$WEB_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting API on http://localhost:${PORT:-3000}"
"${RUNNER[@]}" api:dev &
API_PID=$!

echo "Starting Web on ${VITE_API_BASE_URL:-http://localhost:3000} backed Vite dev server"
"${RUNNER[@]}" dev &
WEB_PID=$!

wait -n "$API_PID" "$WEB_PID"
STATUS=$?
exit "$STATUS"
