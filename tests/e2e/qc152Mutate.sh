#!/usr/bin/env bash
# Query Centre v152 — proves each QC152 lock red (tests/e2e/qc152.measure.ts):
#
#   bash tests/e2e/qc152Mutate.sh L1 L2 L3      each lock against its named break: a page break (PAGE_MUT), or a SOURCE
#                                               break below, applied to this tree, built, run, and restored from a backup
#                                               named by path (never `git checkout`)
#   QC152_BASE_DIST=<dir> bash tests/e2e/qc152Mutate.sh BASE
#                                               every lock against the v151.2 build (an emulator-mode build of the base
#                                               commit, made outside this tree), then this tree rebuilt
#
# Ledgers go to reports/qc-v152/ledger/{mut-<lock>-,base-}*.json; a lock is proved when its ledger has a red row.
set -u
cd "$(dirname "$0")/../.." || exit 1
BK=/tmp/qc152-mut; mkdir -p "$BK"
build() { npx vite build --mode emulator --outDir dist-emu --emptyOutDir > /tmp/qc152-mutbuild.txt 2>&1 || { echo "build failed"; exit 1; }; }
spec() { echo "QC152_MUTATE=$1 QC152_ONLY=$1 node scripts/emu-e2e-inner.mjs tests/e2e/qc152.measure.ts --project=measure --workers=1"; }
# a source break: <file> <python replace from> <to>
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
restore() { local f="$1"; cp "$BK/$(echo "$f" | tr '/' '-')" "$f"; }

if [ "${1:-}" = "BASE" ]; then
  [ -d "${QC152_BASE_DIST:-}" ] || { echo "QC152_BASE_DIST is not a directory"; exit 1; }
  rm -rf dist-emu && cp -R "$QC152_BASE_DIST" dist-emu && touch dist-emu/index.html
  bash tests/e2e/qc152Run.sh "QC152_BASE=1 node scripts/emu-e2e-inner.mjs tests/e2e/qc152.measure.ts --project=measure --workers=1"
  build; echo "rebuilt this tree into dist-emu"; exit 0
fi
for L in "${@:-L1 L2 L3}"; do
  case "$L" in
    L1) F=src/lib/queryState.ts; srcbreak $F '  if (ms == null || ms > nowMs) return null;' '  if (ms == null || ms > nowMs || ms > 0) return null; /* MUT L1: ignore the nudge date */' ;;
    L3) F=src/lib/queryState.ts; srcbreak $F 's === "offer" || s === "materials" || s === "nudge" ? "you" : s;' 's === "offer" || s === "materials" || s === "nudge" || s === "quiet" ? "you" : s; /* MUT L3 */' ;;
    *) F="" ;;
  esac
  build
  bash tests/e2e/qc152Run.sh "$(spec $L)"; echo "MUT-DONE-$L"
  [ -n "$F" ] && restore $F
done
build; echo "rebuilt this tree into dist-emu"
