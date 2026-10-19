#!/bin/bash
# Query Centre v140 — prove each QC140 lock red. Run in the MEASUREMENT worktree only (never the primary checkout):
# every source break is backed up by its PATH (/tmp/qc140mut/<path with / as ->), built with build:dev, measured against
# the preview on $PORT, and put back from that backup — never with git. Then the page-side breaks (QC140_MUTATE).
# Writes reports/qc-v140/mutations.jsonl, one line per break: the lock, the break, and whether the lock went red.
set -u
PORT=${PORT:-4501}
OUT=reports/qc-v140/mutations.jsonl
BK=/tmp/qc140mut
mkdir -p "$BK" reports/qc-v140/runs
# ONLY="<break> <break>" re-runs just those breaks and appends to the record (the page-side breaks then run only if named)
[ -z "${ONLY:-}" ] && : > "$OUT"
only() { [ -z "${ONLY:-}" ] || [[ " $ONLY " == *" $1 "* ]]; }

# mutate <lock> <name> <file> <python-old> <python-new>
mutate() {
  local lock=$1 name=$2 file=$3 old=$4 new=$5
  only "$name" || return 0
  local bak="$BK/$(echo "$file" | tr / -)"
  cp "$file" "$bak" || { echo "STOP: no $file"; exit 1; }
  python3 - "$file" "$old" "$new" <<'EOF' || { cp "$bak" "$file"; echo "STOP: $name did not apply"; exit 1; }
import sys
p, a, b = sys.argv[1:4]
s = open(p).read()
assert s.count(a) == 1, f"{a!r} found {s.count(a)} times"
open(p, "w").write(s.replace(a, b))
EOF
  if ! npm run build:dev > "reports/qc-v140/runs/mut-$name-build.log" 2>&1; then
    cp "$bak" "$file"; echo "{\"lock\":\"$lock\",\"break\":\"$name\",\"red\":null,\"note\":\"build failed\"}" >> "$OUT"; return
  fi
  SA_E2E_BASE_URL=http://127.0.0.1:$PORT npx playwright test tests/e2e/qcV140.measure.ts --reporter=line --workers=1 -g "$lock ·" > "reports/qc-v140/runs/mut-$name.log" 2>&1
  local code=$?
  cp "$bak" "$file"
  local first=$(grep -m1 -E "✗" "reports/qc-v140/runs/mut-$name.log" | sed 's/"/\\"/g' | cut -c1-200)
  echo "{\"lock\":\"$lock\",\"break\":\"$name\",\"red\":$([ $code -ne 0 ] && echo true || echo false),\"first\":\"$first\"}" >> "$OUT"
  echo "$lock $name exit $code"
}

TB=src/components/queries/centre/QcToolbar140.tsx
BM=src/components/queries/centre/bandMarks.tsx
Q=src/components/Queries.tsx

mutate A2 drop-badge "$BM" \
  '{art.badge ? <i className={`qc140-jbd' '{false ? <i className={`qc140-jbd'
mutate A3 offset-left "$TB" \
  'if (b.getBoundingClientRect().right - left > lim)' 'if (b.offsetLeft + b.offsetWidth > lim + 9999)'
mutate A4 ignore-stack "$TB" \
  'return (w?.offsetHeight ?? 0) + (h?.offsetHeight ?? 0);' 'return 0 * ((w?.offsetHeight ?? 0) + (h?.offsetHeight ?? 0));'
mutate C3 noreply-heard src/lib/qc140.ts \
  'else if (g === "passed") passed++;' 'else if (g === "passed" || g === "noReply") passed++;'
mutate D1 own-state src/lib/qc140.ts \
  'title: "Overdue", line: "Past the date you expected", field: "past" }' 'title: "Overdue", line: "Past the date you expected", field: "dueWeek" }'
mutate D1 band-own-state "$Q" \
  'overdueOn={qcF138.past} loading' 'overdueOn={false} loading'
mutate D2 esc-pin-first src/components/shell/ListPills.tsx \
  'useEscapeLayer(open !== null, close, ESC_LEVEL.page);' 'useEscapeLayer(open !== null, close, ESC_LEVEL.pageMode - 1);'
mutate E1 agent-grows src/components/queries/centre/qcv140.css \
  '--qc138-cols: minmax(190px, 264px) minmax(92px' '--qc138-cols: minmax(160px, 1.3fr) minmax(92px'
mutate F1 restore-after-paint "$Q" \
  'const [qcGroup, setQcGroupState] = useState<GroupBy>(() => qcRemView.group);' \
  'const [qcGroup, setQcGroupState] = useState<GroupBy>("attention"); useEffect(() => { const t = setTimeout(() => setQcGroupState(qcRemView.group), 2500); return () => clearTimeout(t); }, []);'
mutate G1 tick-guide-button "$Q" \
  'if (qcPin.full && !was.full && !was.known && routeActive) tickGuide.current("pin");' \
  'if (false && qcPin.full && !was.full && !was.known && routeActive) tickGuide.current("pin");'

# the tree must be back to the branch before the page-side breaks
test -z "$(git status --porcelain -- src)" || { echo "STOP: src not restored"; git status --short -- src; exit 1; }
npm run build:dev > reports/qc-v140/runs/mut-clean-build.log 2>&1 || { echo "STOP: clean build failed"; exit 1; }

for lock in A1 B1 C1 C2 C4; do
  only "page:$lock" || continue
  QC140_MUTATE=$lock SA_E2E_BASE_URL=http://127.0.0.1:$PORT npx playwright test tests/e2e/qcV140.measure.ts --reporter=line --workers=1 -g "$lock ·" > "reports/qc-v140/runs/mut-page-$lock.log" 2>&1
  code=$?
  first=$(grep -m1 -E "✗" "reports/qc-v140/runs/mut-page-$lock.log" | sed 's/"/\\"/g' | cut -c1-200)
  echo "{\"lock\":\"$lock\",\"break\":\"page:$lock\",\"red\":$([ $code -ne 0 ] && echo true || echo false),\"first\":\"$first\"}" >> "$OUT"
  echo "$lock page exit $code"
done
echo DONE
