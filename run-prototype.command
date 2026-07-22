#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Run the Starman design prototype WITHOUT Docker.
#
# The prototype (design/Starman.html) is a single self-contained web page with
# built-in demo data — it needs no database, no server build, and no Docker.
# This script just serves the design/ folder and opens the page in your browser.
#
# Just double-click this file. (First time: right-click → Open to approve it.)
# Close the Terminal window (or press Ctrl-C) to stop.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
DESIGN_DIR="$ROOT/design"
PORT=4173
URL="http://localhost:${PORT}/Starman.html"

cd "$DESIGN_DIR"

# Preferred: a tiny local web server (assets load reliably, localStorage works).
if command -v python3 >/dev/null 2>&1; then
  echo "Starting Starman prototype (no Docker)…"
  echo "  → $URL"
  echo "  (login: andrew@aspire.ca / starman123 — close this window to stop)"
  # Open the browser once the server is up, then serve in the foreground.
  ( for _ in $(seq 1 20); do
      curl -fsS "$URL" >/dev/null 2>&1 && { open "$URL"; break; }
      sleep 0.3
    done ) &
  exec python3 -m http.server "$PORT"
fi

# Fallback: no python3 — just open the file directly in the browser.
echo "python3 not found; opening the prototype file directly…"
open "Starman.html"
