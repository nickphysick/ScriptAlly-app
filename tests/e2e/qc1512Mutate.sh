#!/usr/bin/env bash
[ -n "${HEAVY_SLOT_TOKEN:-}" ] || exec node "$(git rev-parse --show-toplevel)/scripts/heavy-slot.mjs" run -- bash "$0" "$@"  # one heavy job at a time: the test slot (scripts/heavy-slot.mjs)
# Query Centre v151.2 — proves each QC1512 lock red (tests/e2e/qc1512.measure.ts):
#
#   bash tests/e2e/qc1512Mutate.sh                 every lock against its named break (PAGE_MUT), one build
#   bash tests/e2e/qc1512Mutate.sh L5 L9           just those
#   QC1512_BASE_DIST=<dir> bash tests/e2e/qc1512Mutate.sh BASE
#                                                  every lock against the v151.1 build it replaces (an emulator-mode build
#                                                  of the base commit, made outside this tree), then this tree rebuilt
#
# Each run writes reports/qc-v151-2/ledger/{mut-<lock>-,base-}*.json; a lock is proved when its ledger has a red row.
# ⚠️ Waits for any other session's emulators (tests/e2e/qc1512Run.sh); never stops them.
set -u
cd "$(dirname "$0")/../.." || exit 1
build() { npx vite build --mode emulator --outDir dist-emu --emptyOutDir > /tmp/qc1512-mutbuild.txt 2>&1 || { echo "build failed"; exit 1; }; }
if [ "${1:-}" = "BASE" ]; then
  [ -d "${QC1512_BASE_DIST:-}" ] || { echo "QC1512_BASE_DIST is not a directory"; exit 1; }
  rm -rf dist-emu && cp -R "$QC1512_BASE_DIST" dist-emu && touch dist-emu/index.html
  bash tests/e2e/qc1512Run.sh "QC1512_BASE=1 node scripts/emu-e2e-inner.mjs tests/e2e/qc1512.measure.ts --project=measure --workers=1"
  build; echo "rebuilt this tree into dist-emu"
  exit 0
fi
build
LOCKS="${*:-L1 L2 L3 L4 L5 L6 L7 L8 L9 L10 L11}"
INNER=""
for L in $LOCKS; do INNER="$INNER QC1512_MUTATE=$L QC1512_ONLY=$L node scripts/emu-e2e-inner.mjs tests/e2e/qc1512.measure.ts --project=measure --workers=1; echo MUT-DONE-$L;"; done
bash tests/e2e/qc1512Run.sh "bash -c '$INNER true'"
