#!/usr/bin/env bash
# Query Centre v152.1 — proves each QC1521 lock red (tests/e2e/qc1521.measure.ts):
#
#   bash tests/e2e/qc1521Mutate.sh L1 L2 …      each lock against its named break: a page break (PAGE_MUT in the spec), or
#                                               a SOURCE break below, applied to this tree, built, run, and restored from a
#                                               backup named by path (never `git checkout`)
#   QC1521_BASE_DIST=<dir> QC1521_ONLY=L1 bash tests/e2e/qc1521Mutate.sh BASE
#                                               the locks against the v152 build (an emulator-mode build of the base commit,
#                                               made outside this tree), then this tree rebuilt
#
# Ledgers go to reports/qc-v152-1/ledger/{mut-<lock>-,base-}*.json; a lock is proved when its ledger has a red row.
set -u
cd "$(dirname "$0")/../.." || exit 1
BK=/tmp/qc1521-mut; mkdir -p "$BK"
F=""
restore() { local f="$1"; cp "$BK/$(echo "$f" | tr '/' '-')" "$f"; }
build() { npx vite build --mode emulator --outDir dist-emu --emptyOutDir > /tmp/qc1521-mutbuild.txt 2>&1 || { echo "build failed"; [ -n "$F" ] && restore "$F"; exit 1; }; }
spec() { echo "QC1521_MUTATE=$1 QC1521_ONLY=$1 node scripts/emu-e2e-inner.mjs tests/e2e/qc1521.measure.ts --project=measure --workers=1"; }
# a source break: <file> <from> <to> (the anchor must occur exactly once)
srcbreak() {
  local f="$1"; local b="$BK/$(echo "$f" | tr '/' '-')"
  cp "$f" "$b"
  python3 - "$f" "$2" "$3" <<'PY'
import sys
p,a,b=sys.argv[1:4]; s=open(p).read()
assert s.count(a)==1, "mutation anchor not found once: "+a
open(p,'w').write(s.replace(a,b))
PY
}

if [ "${1:-}" = "BASE" ]; then
  [ -d "${QC1521_BASE_DIST:-}" ] || { echo "QC1521_BASE_DIST is not a directory"; exit 1; }
  rm -rf dist-emu && cp -R "$QC1521_BASE_DIST" dist-emu && touch dist-emu/index.html
  bash tests/e2e/qc152Run.sh "QC1521_BASE=1 ${QC1521_ONLY:+QC1521_ONLY=$QC1521_ONLY} node scripts/emu-e2e-inner.mjs tests/e2e/qc1521.measure.ts --project=measure --workers=1"
  build; echo "rebuilt this tree into dist-emu"; exit 0
fi
for L in "$@"; do
  F=""
  case "$L" in
    L1) F=src/lib/qc1512.ts; srcbreak $F 'export const STATUS_FILL: Record<StatusKind, string> = { sand: "#f2ebe0",' 'export const STATUS_FILL: Record<StatusKind, string> = { sand: "#e6d9c6", /* MUT L1 */' ;;
  esac
  build
  bash tests/e2e/qc152Run.sh "$(spec $L)"; echo "MUT-DONE-$L"
  [ -n "$F" ] && restore $F
done
build; echo "rebuilt this tree into dist-emu"
