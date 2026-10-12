#!/bin/bash
# Comparable titles v25 — prove every rendered lock red by its named mutation.
#
#   SA_E2E_BASE_URL=http://127.0.0.1:<port> bash tests/e2e/cv25Mutations.sh
#
# Seven mutations are applied in the page (CV25_MUTATE reaches the suite). Six are edits to the
# source: each is made, the dev bundle rebuilt, the lock run, and the file put back FROM A COPY —
# never with git, which would restore HEAD and take uncommitted work with it. Run it in the
# measurement worktree, with `vite preview` serving that worktree's dist/.
set -u
cd "$(dirname "$0")/../.." || exit 1
: "${SA_E2E_BASE_URL:?set SA_E2E_BASE_URL}"
OUT=reports/comps-v25/mutation-runs; mkdir -p "$OUT"
BAK="${TMPDIR:-/tmp}/cv25-mut-$$"; mkdir -p "$BAK"

# ONLY="C1 D1" limits the run to those locks.
want() { [ -z "${ONLY:-}" ] || case " $ONLY " in *" $1 "*) true;; *) false;; esac; }
run() { # lock
  CV25_MUTATE="$1" CV25_KEEP=1 npx playwright test tests/e2e/compsV25.measure.ts -g "^.*$1 · " > "$OUT/$1.log" 2>&1
  echo "$1: exit $? · $(grep -c '✗' "$OUT/$1.log") red reading(s)"
}
for L in B1 B2 C1 D1 D2 E1 L1; do want "$L" && run "$L"; done

src() { # lock file python-edit
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
src A1 "$PAGE" 'const clean = withCompIds(next.map(normalizeComp));' 'const clean = withCompIds(next.map(normalizeComp).map((c) => { const d = { ...c }; delete d.id; return d; }));'
src A3 src/components/manuscripts/comps25/CompLetterPicker.tsx 'const fixed = sent > 0 && recorded;' 'const fixed = false;'
src D3 src/lib/compsLibrary.ts 'const firstDir = (k: SortKey): 1 | -1 => (k === "title" ? 1 : -1);' 'const firstDir = (_k: SortKey): 1 | -1 => 1;'
src D4 "$PAGE" 'useState<GroupBy>("none")' 'useState<GroupBy>("where")'
src E2 "$PAGE" 'const err = await updateVersion(letterId, { compIds: ids });' 'let err: string | null = null; for (const l of letters) { const e = await updateVersion(l.id, { compIds: ids }); if (l.id === letterId) err = e; }'
src F1 src/components/shell/useFullScreenList.ts 'useEffect(() => (full ? holdSidebarCollapsed() : undefined), [full]);' 'useEffect(() => undefined, [full]);'

npm run build:dev > "$OUT/restore.build.log" 2>&1 && echo "restored and rebuilt"
node tests/e2e/seedCompsV25.mjs --restore > /dev/null 2>&1
rm -rf "$BAK"
