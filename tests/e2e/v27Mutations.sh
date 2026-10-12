#!/bin/bash
# Comparable titles v27 — prove every V27 lock red by its named mutation.
#
#   SA_E2E_BASE_URL=http://127.0.0.1:<port> bash tests/e2e/v27Mutations.sh      (ONLY="V2 V5" for some)
#
# Three mutations are applied in the page (V27_MUTATE reaches the suite). Seven are edits to the
# source: each is made, the dev bundle rebuilt, the lock run, and the file put back FROM A COPY, never
# with git. Run it in the measurement worktree, with `vite preview` serving that worktree's dist/.
# ⚠️ Do not edit src/ while it runs: the bundle guard refuses a stale bundle, and it is right.
set -u
cd "$(dirname "$0")/../.." || exit 1
: "${SA_E2E_BASE_URL:?set SA_E2E_BASE_URL}"
OUT=reports/comps-v27/mutation-runs; mkdir -p "$OUT"
BAK="${TMPDIR:-/tmp}/v27-mut-$$"; mkdir -p "$BAK"
want() { [ -z "${ONLY:-}" ] || case " $ONLY " in *" $1 "*) true;; *) false;; esac; }
run() {
  V27_MUTATE="$1" CV25_KEEP=1 npx playwright test tests/e2e/compsV27.measure.ts -g "^.*$1 · " > "$OUT/$1.log" 2>&1
  echo "$1: exit $? · $(grep -c '✗' "$OUT/$1.log") red reading(s)"
}
for L in V1 V3 V10; do want "$L" && run "$L"; done

src() { # lock file old new
  want "$1" || return
  local key; key="$(echo "$2" | tr '/' '-')"
  cp "$2" "$BAK/$key" || exit 1
  python3 -I -c "
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read(); o=sys.argv[2]; n=sys.argv[3]
assert s.count(o)==1, ('mutation anchor not found exactly once', p, o[:60], s.count(o))
open(p,'w',encoding='utf-8').write(s.replace(o,n))" "$2" "$3" "$4" || { cp "$BAK/$key" "$2"; echo "$1: MUTATION NOT APPLIED"; return; }
  if npm run build:dev > "$OUT/$1.build.log" 2>&1; then run "$1"; else echo "$1: the mutated build failed"; fi
  cp "$BAK/$key" "$2"
}
PAGE=src/components/manuscripts/ComparableTitlesPage.tsx
# V2: render the strip when empty
src V2 "$PAGE" '<section className="cv-stepcard" data-cv="empty">' '<CompsStrip g={g} rows={rows} filter={filter} loading={false} onFilter={pickFilter} /><section className="cv-stepcard" data-cv="empty">'
# V4: open in "Add a comp" mode
src V4 src/components/manuscripts/comps25/CompDrawer.tsx 'const first = p.comps.length === 0;' 'const first = false;'
# V5: require a reload to switch (the state is whatever it was when comps first loaded)
src V5 "$PAGE" 'const isEmpty = comps.length === 0;' 'const isEmpty = loading ? comps.length === 0 : ((window as unknown as { __cvE?: boolean }).__cvE ??= comps.length === 0);'
# V6: treat "loading" as empty
src V6 "$PAGE" 'const empty = !loading && !!activeMs && isEmpty;' 'const empty = isEmpty;'
# V7: leave the band on the page
src V7 "$PAGE" '              <CompsLibrary' '              <CompsSteps headingId="cv-band-h" onPick={() => setPicker({ letterId: null })} /><CompsLibrary'
# V8: drop the focus return
src V8 src/components/manuscripts/comps25/CompsHowDialog.tsx 'opener.focus({ preventScroll: true });' 'void opener;'
# V9: leave the pop-up open beneath the picker
src V9 "$PAGE" 'onPick={() => { setHow(false); setPicker({ letterId: null }); }}' 'onPick={() => { setPicker({ letterId: null }); }}'

npm run build:dev > "$OUT/restore.build.log" 2>&1 && echo "restored and rebuilt"
node tests/e2e/seedCompsV25.mjs --restore > /dev/null 2>&1
rm -rf "$BAK"
