#!/bin/bash
# Comparable titles v27.1 — prove W1, W2 and X1 red by their named mutations.
#
#   SA_E2E_BASE_URL=http://127.0.0.1:<port> bash tests/e2e/v271Mutations.sh
#
# W1 and W2 are applied in the page. X1 is an edit to the source: made, the dev bundle rebuilt, the lock
# run, and the file put back FROM A COPY, never with git. Run it in the measurement worktree.
# ⚠️ Do not edit src/ while it runs: the bundle guard refuses a stale bundle, and it is right.
set -u
cd "$(dirname "$0")/../.." || exit 1
: "${SA_E2E_BASE_URL:?set SA_E2E_BASE_URL}"
OUT=reports/comps-v27-1/mutation-runs; mkdir -p "$OUT"
BAK="${TMPDIR:-/tmp}/v271-mut-$$"; mkdir -p "$BAK"
run() {
  V271_MUTATE="$1" CV25_KEEP=1 npx playwright test tests/e2e/compsV271.measure.ts -g "^.*$1 · " > "$OUT/$1.log" 2>&1
  echo "$1: exit $? · $(grep -c '✗' "$OUT/$1.log") red reading(s)"
}
# W1 and W2 retired with comps v28 (the v25 list)
# X1: swap the SVG back for a text "✕"
F=src/components/manuscripts/comps25/marks.tsx
cp "$F" "$BAK/src-components-manuscripts-comps25-marks.tsx" || exit 1
python3 -I -c "
import sys,re
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
m=re.findall(r'        <svg width=\{g\}[^\n]*</svg>\n',s)
assert len(m)==1, ('mutation anchor not found exactly once', len(m))
open(p,'w',encoding='utf-8').write(s.replace(m[0],'        ✕\n'))" "$F" || { cp "$BAK/src-components-manuscripts-comps25-marks.tsx" "$F"; echo "X1: MUTATION NOT APPLIED"; }
if npm run build:dev > "$OUT/X1.build.log" 2>&1; then run X1; else echo "X1: the mutated build failed"; fi
cp "$BAK/src-components-manuscripts-comps25-marks.tsx" "$F"
npm run build:dev > "$OUT/restore.build.log" 2>&1 && echo "restored and rebuilt"
node tests/e2e/seedCompsV25.mjs --restore > /dev/null 2>&1
rm -rf "$BAK"
