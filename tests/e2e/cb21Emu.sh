#!/bin/sh
[ -n "${HEAVY_SLOT_TOKEN:-}" ] || exec node "$(git rev-parse --show-toplevel)/scripts/heavy-slot.mjs" run -- bash "$0" "$@"  # one heavy job at a time: the test slot (scripts/heavy-slot.mjs)
# Corkboard v2.1: the emulator run in two steps — build dist-emu first, THEN wait for the shared emulator ports and
# start the emulators straight away. `npm run e2e:emu` waits before its 4–7 minute build, and another session can take
# the fixed ports inside that window (it did, 6 Nov). Same build, same emulators, same inner runner as scripts/emu.mjs.
#   sh tests/e2e/cb21Emu.sh [--no-build] <playwright args>
set -e
cd "$(dirname "$0")/../.."
JDK=/opt/homebrew/opt/openjdk@21/bin; [ -d "$JDK" ] && PATH="$JDK:$PATH"; export PATH
unset ALLOW_LIVE_FIRESTORE
if [ "$1" = "--no-build" ]; then shift; else npx vite build --mode emulator --outDir dist-emu --emptyOutDir > /tmp/cb21-emu-build.log 2>&1 || { tail -20 /tmp/cb21-emu-build.log; exit 1; }; fi
free() { ! lsof -nP -iTCP:4405 -sTCP:LISTEN >/dev/null 2>&1 && ! lsof -nP -iTCP:8085 -sTCP:LISTEN >/dev/null 2>&1 && ! lsof -nP -iTCP:9095 -sTCP:LISTEN >/dev/null 2>&1; }
q=""; for a in "$@"; do q="$q '$(printf %s "$a" | sed "s/'/'\\\\''/g")'"; done
# Another session can take the ports between our check and the emulators binding; when it does, wait and try again.
set +e; set -o pipefail
n=0
while :; do
  until free; do sleep 5; done
  npx firebase emulators:exec --config firebase.emulator.json --only auth,firestore,storage --project demo-scriptally --import tests/emulator-data "node tests/emulator-seed/authUser.mjs && node scripts/emu-e2e-inner.mjs$q" 2>&1 | tee /tmp/cb21-emu-run.log
  rc=$?
  grep -q "port taken" /tmp/cb21-emu-run.log || exit $rc
  n=$((n+1)); [ $n -ge 20 ] && { echo "gave up: ports kept being taken"; exit 1; }
  echo "ports taken by another session; waiting ($n)"; sleep 20
done
