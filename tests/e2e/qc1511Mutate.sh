#!/usr/bin/env bash
# Query Centre v151.1 — proves each QC1511 lock red (tests/e2e/qc1511.measure.ts):
#
#   bash tests/e2e/qc1511Mutate.sh                 every lock against its named break (PAGE_MUT), one build
#   bash tests/e2e/qc1511Mutate.sh L5 L9           just those
#   QC1511_BASE_DIST=<dir> bash tests/e2e/qc1511Mutate.sh BASE
#                                                  every lock against the v151 build it replaces (an emulator-mode build
#                                                  of the base commit, made outside this tree), then this tree rebuilt
#
# Each run writes reports/qc-v151-1/ledger/{mut-<lock>-,base-}*.json; a lock is proved when its ledger has a red row.
# ⚠️ Waits for any other session's emulators (tests/e2e/qc1511Run.sh); never stops them.
set -u
cd "$(dirname "$0")/../.." || exit 1
build() { npx vite build --mode emulator --outDir dist-emu --emptyOutDir > /tmp/qc1511-mutbuild.txt 2>&1 || { echo "build failed"; exit 1; }; }
if [ "${1:-}" = "BASE" ]; then
  [ -d "${QC1511_BASE_DIST:-}" ] || { echo "QC1511_BASE_DIST is not a directory"; exit 1; }
  rm -rf dist-emu && cp -R "$QC1511_BASE_DIST" dist-emu && touch dist-emu/index.html
  bash tests/e2e/qc1511Run.sh "QC1511_BASE=1 node scripts/emu-e2e-inner.mjs tests/e2e/qc1511.measure.ts --project=measure --workers=1"
  build; echo "rebuilt this tree into dist-emu"
  exit 0
fi
build
LOCKS="${*:-L1 L2 L3 L4 L5 L6 L7 L8 L9 L10}"
INNER=""
for L in $LOCKS; do INNER="$INNER QC1511_MUTATE=$L QC1511_ONLY=$L node scripts/emu-e2e-inner.mjs tests/e2e/qc1511.measure.ts --project=measure --workers=1; echo MUT-DONE-$L;"; done
bash tests/e2e/qc1511Run.sh "bash -c '$INNER true'"
