#!/usr/bin/env bash
[ -n "${HEAVY_SLOT_TOKEN:-}" ] || exec node "$(git rev-parse --show-toplevel)/scripts/heavy-slot.mjs" run -- bash "$0" "$@"  # one heavy job at a time: the test slot (scripts/heavy-slot.mjs)
# To-do list v54 — prove each TD54 lock red with its named break, at 1440 × 900. Needs `npm run dev:emu` serving on
# 127.0.0.1:3000 (vite's dev server, so a source break is live within a second or two and gone when it is restored).
# Page-side breaks: TD54_MUTATE=<lock>, applied by todoV54.measure.ts. Source breaks: one line of the shipped code,
# changed in THIS worktree and restored from a path-named backup before the next (never `git checkout`).
# Each line of reports/todo-list-v54/mutation-proofs.txt names the lock, its break, and red or GREEN (a GREEN is a lock
# that did not notice its break, and fails the script).
set -u
cd "$(dirname "$0")/../.."
OUT=reports/todo-list-v54/mutation-proofs.txt
mkdir -p reports/todo-list-v54 /tmp/td54mut
: > "$OUT"
BASE="${SA_E2E_BASE_URL:-http://127.0.0.1:3000}"
fail=0
run() { # lock, grep, what
  local lock="$1" pat="$2" what="$3" log="/tmp/td54mut/$1-$RANDOM.log"
  SA_E2E_BASE_URL="$BASE" npx playwright test tests/e2e/todoV54.measure.ts --project=measure --no-deps --workers=1 --reporter=line -g "$pat" > "$log" 2>&1
  local fired; fired=$(grep -m1 -E "Error: " "$log" | sed 's/^ *//' | cut -c1-150)
  if grep -qE "[0-9]+ failed" "$log"; then echo "$lock · red · ${what} · ${fired}" >> "$OUT"
  else echo "$lock · GREEN (did not notice) · ${what}" >> "$OUT"; fail=1; fi
}
page() { TD54_MUTATE="$1" run "$1" "$2" "page: $3"; }
# a source break: file, exact old text, new text
src() {
  local lock="$1" pat="$2" file="$3" old="$4" new="$5" bak="/tmp/td54mut/$(echo "$3" | tr '/' '-')"
  cp "$file" "$bak"
  python3 - "$file" "$old" "$new" <<'PY'
import sys
p, old, new = sys.argv[1:]
s = open(p).read()
assert old in s, f"break text not found in {p}"
open(p, "w").write(s.replace(old, new, 1))
PY
  sleep 3
  run "$lock" "$pat" "source: $file"
  cp "$bak" "$file"
  sleep 3
}
ONLY="${TD54_ONLY:-}"
want() { [ -z "$ONLY" ] || echo " $ONLY " | grep -q " $1 "; }

want L1 && page L1 'L1 .*\(1440\)' 'the workspace 80px taller than the window'
want L2 && page L2 'L2 .*\(1440\)' 'the questions box stops scrolling, so the footer is pushed off'
want L3 && page L3 'L3 .*\(1440\)' 'the table view gets its 16px top padding back'
want L4 && page L4 'L4 ' 'the armchair hawk on a grey box'
want L5 && page L5 'L5 ' 'the legend says 99 nudges'
want L6 && src L6 'L6 ' src/lib/todoBatch54.ts 'export const BATCH_TABLE_FROM = 8;' 'export const BATCH_TABLE_FROM = 15;'
want L7 && src L7 'L7 ' src/lib/todoBatch54.ts '  if (!asks) return emptyAnswer();' '  return emptyAnswer();'
want L8 && src L8 'L8 ' src/lib/todoBatch54.ts '  if (cur.sentMs != null && other.sentMs != null' '  if (false && cur.sentMs != null && other.sentMs != null'
want L9 && src L9 'L9 ' src/lib/sentSample.ts '  if (s.sect && s.from > 1) {' '  if (false) {'
want L10 && src L10 'L10 ' src/lib/todoBatch54.ts '    if (hasAnswer(out[id])) continue;' '    void 0;'
want L11 && src L11 'L11 ' src/lib/todoBatch54.ts '  if (!asks?.sample || !a.samp) return null;' '  return null;'
want L12 && page L12 'L12 ' 'a v54 header part injected into the phone page'
cat "$OUT"
exit $fail
