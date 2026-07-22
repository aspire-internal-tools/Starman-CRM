#!/usr/bin/env bash
# One-click launcher for Starman on macOS.
# Starts the Starman app with Docker and opens it at http://localhost:4000.
#
# Just double-click this file. (First time: right-click → Open to approve it.)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$ROOT/starman-app"
URL="http://localhost:4000"
LOG="${TMPDIR:-/tmp}/starman-launch.log"

cd "$APP_DIR"

# Make sure Docker Desktop is available and running.
if ! command -v docker >/dev/null 2>&1; then
  osascript -e 'display alert "Docker not found" message "Install and open Docker Desktop, then run this again."'
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Starting Docker Desktop..." | tee "$LOG"
  open -a Docker || true
  for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 2; done
fi

echo "Building & starting Starman (first run takes a few minutes)..." | tee -a "$LOG"
docker compose up -d --build >> "$LOG" 2>&1

# Wait until the app answers, then open the browser.
for _ in $(seq 1 45); do
  if curl -fsS "$URL" >/dev/null 2>&1; then break; fi
  sleep 1
done

open "$URL"
echo "Starman is running at $URL  (login: andrew@aspire.ca / starman123)"
