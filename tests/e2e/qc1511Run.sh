#!/usr/bin/env bash
# Query Centre v151.1 — runs a spec on the emulator build, waiting for another session's emulators to finish first.
#   bash tests/e2e/qc1511Run.sh "<env> node scripts/emu-e2e-inner.mjs <spec> --project=measure --workers=1"
# ⚠️ The emulator ports (8085 / 9095 / 4321) are shared by every worktree on this machine: wait, never kill.
set -u
cd "$(dirname "$0")/../.." || exit 1
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"; unset ALLOW_LIVE_FIRESTORE
for i in $(seq 1 1080); do
  lsof -nP -iTCP:8085 -iTCP:9095 -iTCP:4321 -iTCP:4405 -sTCP:LISTEN >/dev/null 2>&1 || break
  [ "$i" = 1 ] && echo "waiting for another session's emulators to finish…"
  sleep 5
done
node scripts/emu-guard.mjs npx firebase emulators:exec --config firebase.emulator.json --only firestore,auth,storage --project demo-scriptally \
  --import tests/emulator-data "node tests/emulator-seed/authUser.mjs && $1"
