#!/bin/bash
# Comparable titles v26 — prove every AD lock red by its named mutation.
#
#   SA_E2E_BASE_URL=http://127.0.0.1:<port> bash tests/e2e/adMutations.sh      (ONLY="AD2 AD5" for some)
#
# Four mutations are applied in the page (AD_MUTATE reaches the suite). Five are edits to the source:
# each is made, the dev bundle rebuilt, the lock run, and the file put back FROM A COPY, never with
# git. Run it in the measurement worktree, with `vite preview` serving that worktree's dist/.
# ⚠️ Do not edit src/ while it runs: the bundle guard refuses a stale bundle, and it is right.
set -u
cd "$(dirname "$0")/../.." || exit 1
: "${SA_E2E_BASE_URL:?set SA_E2E_BASE_URL}"
OUT=reports/comps-v26-1/mutation-runs; mkdir -p "$OUT"
BAK="${TMPDIR:-/tmp}/ad-mut-$$"; mkdir -p "$BAK"
want() { [ -z "${ONLY:-}" ] || case " $ONLY " in *" $1 "*) true;; *) false;; esac; }
run() { # lock [tag: a second mutation of the same lock logs under lock-tag]
  local log="$OUT/$1${2:+-$2}.log"
  AD_MUTATE="$1" CV25_KEEP=1 npx playwright test tests/e2e/compsV26.measure.ts -g "^.*$1 · " > "$log" 2>&1
  echo "$1${2:+ ($2)}: exit $? · $(grep -c '✗' "$log") red reading(s)"
}
# AD8 retired with comps v28 (the form has no preview)
for L in AD1 AD5; do want "$L" && run "$L"; done

src() { # lock file old new
  want "$1" || return
  local key; key="$(echo "$2" | tr '/' '-')"
  cp "$2" "$BAK/$key" || exit 1
  python3 -I -c "
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read(); o=sys.argv[2]; n=sys.argv[3]
assert s.count(o)==1, ('mutation anchor not found exactly once', p, o[:60], s.count(o))
open(p,'w',encoding='utf-8').write(s.replace(o,n))" "$2" "$3" "$4" || { cp "$BAK/$key" "$2"; echo "$1: MUTATION NOT APPLIED"; return; }
  if npm run build:dev > "$OUT/$1.build.log" 2>&1; then run "$1" "${5:-}"; else echo "$1: the mutated build failed"; fi
  cp "$BAK/$key" "$2"
}
FORM=src/components/manuscripts/CompForm.tsx
src AD2 "$FORM" '): boolean => o.mode === "add" && o.first;' '): boolean => o.mode === "add";'
src AD3 "$FORM" 'onClick={() => set({ media: m.value })}' 'onClick={() => set({ media: m.value, who: "", pub: "" })}'
src AD4 "$FORM" 'data-cf="save" disabled={!form.hasTitle}' 'data-cf="save" disabled={!form.hasTitle || form.state !== "ready"}'
src AD6 src/components/manuscripts/ComparableTitlesPage.tsx 'if (!o.again) setDrawer(null);' 'setDrawer(null);'
src AD7 "$FORM" '.filter(Boolean).join(" · ");' '.filter(Boolean).join(", ");'
# comps v26.1
src AD10 src/components/manuscripts/ComparableTitlesPage.tsx 'if (el && el.isConnected && !picker) el.focus({ preventScroll: true });' 'void el;'

npm run build:dev > "$OUT/restore.build.log" 2>&1 && echo "restored and rebuilt"
node tests/e2e/seedCompsV25.mjs --restore > /dev/null 2>&1
rm -rf "$BAK"
