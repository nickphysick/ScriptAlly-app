#!/usr/bin/env bash
# Query Centre v151 — proves each QC151 lock red on its named break (tests/e2e/qc151.measure.ts, PAGE_MUT).
#
#   bash tests/e2e/qc151Mutate.sh            every page mutation, one emulator session, one build
#
# Each run writes reports/qc-v151/ledger/mut-<lock>-*.json; a lock is proved when its ledger has a red row.
# ⚠️ Run it in a measurement worktree. The source mutation restores from a path-derived backup, never with git.
set -u
cd "$(dirname "$0")/../.." || exit 1
ROOT=$(pwd)
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"; unset ALLOW_LIVE_FIRESTORE
exec_emu() {
  npx firebase emulators:exec --config firebase.emulator.json --only firestore,auth,storage --project demo-scriptally \
    --import tests/emulator-data "node tests/emulator-seed/authUser.mjs && $1"
}
npx vite build --mode emulator --outDir dist-emu --emptyOutDir > /tmp/qc151-mutbuild.txt 2>&1 || { echo "build failed"; exit 1; }
LOCKS="${1:-L1 L2 L4 L6 L10 L12 L14 L15}"  # v151.1 retired L3 L5 L7 L8 L9 L11 L13
INNER=""
for L in $LOCKS; do INNER="$INNER QC151_MUTATE=$L QC151_ONLY=$L node scripts/emu-e2e-inner.mjs tests/e2e/qc151.measure.ts --project=measure --workers=1; echo MUT-DONE-$L;"; done
exec_emu "bash -c '$INNER true'"
