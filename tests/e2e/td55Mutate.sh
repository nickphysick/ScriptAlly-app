#!/bin/zsh
[ -n "${HEAVY_SLOT_TOKEN:-}" ] || exec node "$(git rev-parse --show-toplevel)/scripts/heavy-slot.mjs" run -- zsh "$0" "$@"  # one heavy job at a time: the test slot (scripts/heavy-slot.mjs)
# To-do list v55 — proves each TD55 lock red: one named break at a time, then the lock must fail.
#   SA_E2E_BASE_URL=http://127.0.0.1:3000 zsh tests/e2e/td55Mutate.sh        (against `npm run dev:emu`, which hot-reloads)
# Page-side breaks go through TD55_MUTATE; source breaks are applied to the file and put back from a path-named copy
# (never `git checkout`, which would take uncommitted work with it). Writes reports/todo-list-v55/mutation-proofs.txt.
set -u
OUT=reports/todo-list-v55/mutation-proofs.txt
BAK=$(mktemp -d)
: > $OUT
run() { # $1 lock label, $2 grep, $3 TD55_MUTATE value
  local log=$BAK/run.log
  TD55_MUTATE=$3 npx playwright test tests/e2e/todoV55.measure.ts --project=measure --no-deps --workers=1 --reporter=line -g "$2" > $log 2>&1
  local failed=$(grep -Eo "[0-9]+ failed" $log | head -1)
  local passed=$(grep -Eo "[0-9]+ passed" $log | head -1)
  local first=$(grep -m1 -E "Error: L[0-9]+|Error: " $log | sed 's/^ *//')
  if [[ -n "$failed" ]]; then echo "$1 RED ($failed, ${passed:-0 passed}) — $first" >> $OUT; else echo "$1 STILL GREEN (${passed:-?}) — the lock did not see the break" >> $OUT; fi
}
src() { # $1 lock label, $2 grep, $3 file, $4 python replace (a, b)
  local f=$3 key=${3//\//-}
  cp $f $BAK/$key
  python3 - "$f" "$4" <<'PY'
import sys, json
p, pair = sys.argv[1], json.loads(sys.argv[2])
s = open(p).read()
assert pair[0] in s, ("anchor missing", pair[0][:60])
open(p, "w").write(s.replace(pair[0], pair[1], 1))
PY
  sleep 4
  run "$1 (source: $5)" "$2" ""
  cp $BAK/$key $f
  sleep 4
}
# page-side
run "L1 · icons wrap to a second line" "L1 · the tray's head is one line" L1
run "L2 · '/' never reaches the page" "L2 ·" L2
run "L3 · the dot is hidden" "L3 ·" L3
run "L4 · the count changes under Agent" "L4 ·" L4
run "L5 · the strip is 112 wide" "L5 · collapse" L5
run "L7 · Jonathan's figure reads 0" "L7 ·" L7
run "L8 · a 'To-do list' label in the tray" "L8 ·" L8
# source
src "L6" "L6 ·" src/components/todo/ws/TodoWorkspace.tsx '["void updateUserPaths({ \"todoPrefs.trayCollapsed\": v })", "void Promise.resolve()"]' "the collapse is not saved"
src "L7" "L7 ·" src/lib/todoTray.ts '["    waitMs: Number.isFinite(anchorMs) ? anchorMs : null,\n", ""]' "trayItem's waitMs gone (the now fallback counts)"
src "L7" "L7 ·" src/lib/todoBuckets.ts '["return Number.isFinite(ms(q.fullRequestedDate)) ? ms(q.fullRequestedDate) : ms(q.statusMovedAt);", "return ms(q.fullRequestedDate);"]' "a full request reads its request date only"
src "L10" "L10 ·" src/components/todo/phone/TodoPhone.tsx '["/**", "/* v55 mutation */\n/**"]' "a phone file touched"
src "L2" "L2 ·" src/lib/todoWs.ts '["  if (f.q.trim() && !t.hay.includes(f.q.trim().toLowerCase())) return false;\n", ""]' "the search filters nothing"
rm -rf $BAK
cat $OUT
