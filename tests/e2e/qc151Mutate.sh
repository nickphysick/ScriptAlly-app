#!/usr/bin/env bash
# Query Centre v151 — proves each QC151 lock red on its named break (tests/e2e/qc151.measure.ts, PAGE_MUT).
#
#   bash tests/e2e/qc151Mutate.sh            every page mutation, one emulator session, one build
#   bash tests/e2e/qc151Mutate.sh L11        the SOURCE mutation: HOVER_MS = 0 in QcPage151.tsx, rebuilt, restored
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
if [ "${1:-}" = "L11" ]; then
  BK=/tmp/qc151mut/src-components-queries-centre-QcPage151.tsx
  mkdir -p /tmp/qc151mut && cp -p src/components/queries/centre/QcPage151.tsx "$BK" || exit 1
  sed -i '' 's/export const HOVER_MS = 1000;/export const HOVER_MS = 0;/' src/components/queries/centre/QcPage151.tsx
  grep -q "HOVER_MS = 0;" src/components/queries/centre/QcPage151.tsx || { echo "mutation did not apply"; cp -p "$BK" src/components/queries/centre/QcPage151.tsx; exit 1; }
  npx vite build --mode emulator --outDir dist-emu --emptyOutDir > /tmp/qc151mut/build.txt 2>&1
  cp -p "$BK" src/components/queries/centre/QcPage151.tsx
  exec_emu "QC151_MUTATE=L11 QC151_ONLY=L11 node scripts/emu-e2e-inner.mjs tests/e2e/qc151.measure.ts --project=measure --workers=1"
  echo "restored: $(grep -c 'HOVER_MS = 1000;' src/components/queries/centre/QcPage151.tsx) (1 = source back)"
  exit 0
fi
npx vite build --mode emulator --outDir dist-emu --emptyOutDir > /tmp/qc151-mutbuild.txt 2>&1 || { echo "build failed"; exit 1; }
LOCKS="${1:-L1 L2 L3 L4 L5 L6 L7 L8 L9 L10 L12 L13 L14 L15}"
INNER=""
for L in $LOCKS; do INNER="$INNER QC151_MUTATE=$L QC151_ONLY=$L node scripts/emu-e2e-inner.mjs tests/e2e/qc151.measure.ts --project=measure --workers=1; echo MUT-DONE-$L;"; done
exec_emu "bash -c '$INNER true'"
