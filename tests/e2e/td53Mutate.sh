#!/usr/bin/env bash
# To-do list v53 — prove each TD53 lock red with its named break (TD53_MUTATE=<lock>, applied in the page by
# todoV53.measure.ts), at 1440 × 900. Needs `npm run dev:emu` serving on 127.0.0.1:3000 (one emulator session for every
# run). Each line of reports/todo-list-v53/mutation-proofs.txt names the lock, the case it ran, and red or GREEN (a
# GREEN is a lock that did not notice its break, and fails the script).
set -u
cd "$(dirname "$0")/../.."
OUT=reports/todo-list-v53/mutation-proofs.txt
mkdir -p reports/todo-list-v53
: > "$OUT"
BASE="${SA_E2E_BASE_URL:-http://127.0.0.1:3000}"
fail=0
run1() { # lock, grep
  local lock="$1" pat="$2" log="/tmp/td53-mut-$1.log"
  TD53_MUTATE="$lock" SA_E2E_BASE_URL="$BASE" npx playwright test tests/e2e/todoV53.measure.ts --project=measure --no-deps --reporter=line -g "$pat" > "$log" 2>&1
  local fired; fired=$(grep -m1 -E "Error: " "$log" | sed 's/^ *//' | cut -c1-150)
  if grep -qE "[0-9]+ failed" "$log"; then echo "$lock · red · ${pat} · ${fired}" >> "$OUT"
  else echo "$lock · GREEN (did not notice) · ${pat}" >> "$OUT"; fail=1; fi
}
ONLY="${TD53_ONLY:-}"
run() { [ -n "$ONLY" ] && ! echo " $ONLY " | grep -q " $1 " && return 0; run1 "$@"; }
run L1  'L1 \+ L2 .*\(1440\)'
run L2  'L1 \+ L2 .*\(1440\)'
run L3  'L3 .*\(1440\)'
run L4  'L1 \+ L2 .*\(1440\)'
run L5  'L4 \+ L5 .*\(1440\)'
run L6  'L6 .*\(1440\)'
run L7  'L7 .*\(1440\)'
run L8  'L8 .*\(1440\)'
run L9  'L9 .*\(1440\)'
run L10 'L10 .*\(1440\)'
run L11 'L10 \+ L11 .*\(1440\)'
run L12 'L1 \+ L2 .*\(1440\)'
run L13 'L13 '
run L14 'L14 '
cat "$OUT"
exit $fail
