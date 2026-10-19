#!/bin/bash
# Query Centre v140.1 — prove each QC1401 lock red under its named break. Run in the MEASUREMENT worktree only: each source
# break is backed up by its PATH (/tmp/qc1401mut/<path with / as ->), built with build:dev, measured against the preview on
# $PORT, and put back from that backup — never with git. Writes reports/qc-v1401/mutations.jsonl.
set -u
PORT=${PORT:-4511}
OUT=reports/qc-v1401/mutations.jsonl
BK=/tmp/qc1401mut
mkdir -p "$BK" reports/qc-v1401/runs
: > "$OUT"
mutate() {
  local lock=$1 name=$2 file=$3 old=$4 new=$5
  local bak="$BK/$(echo "$file" | tr / -)"
  cp "$file" "$bak" || { echo "STOP: no $file"; exit 1; }
  python3 - "$file" "$old" "$new" <<'PY' || { cp "$bak" "$file"; echo "STOP: $name did not apply"; exit 1; }
import sys
p, a, b = sys.argv[1:4]
s = open(p).read()
assert s.count(a) == 1, f"{a!r} found {s.count(a)} times"
open(p, "w").write(s.replace(a, b))
PY
  if ! npm run build:dev > "reports/qc-v1401/runs/mut-$name-build.log" 2>&1; then cp "$bak" "$file"; echo "{\"lock\":\"$lock\",\"break\":\"$name\",\"red\":null}" >> "$OUT"; return; fi
  QC1401_MUTATE="src-$name" SA_E2E_BASE_URL=http://127.0.0.1:$PORT npx playwright test tests/e2e/qcV1401.measure.ts --reporter=line --workers=1 -g "$lock ·" > "reports/qc-v1401/runs/mut-$name.log" 2>&1
  local code=$?
  cp "$bak" "$file"
  local first=$(grep -m1 -E "✗" "reports/qc-v1401/runs/mut-$name.log" | sed 's/"/\\"/g' | cut -c1-200)
  echo "{\"lock\":\"$lock\",\"break\":\"$name\",\"red\":$([ $code -ne 0 ] && echo true || echo false),\"first\":\"$first\"}" >> "$OUT"
  echo "$lock $name exit $code"
}
Q=src/components/Queries.tsx
M=src/components/queries/centre/QcFilterMenu140.tsx
mutate A1 export-all "$Q" \
  'onExport: () => exportQueriesToCSV(qcListOrder().map((r) => r.query),' 'onExport: () => exportQueriesToCSV(queries,'
mutate A2 enabled-at-0 "$M" \
  'data-qc140="filter-export" disabled={showing === 0}' 'data-qc140="filter-export" disabled={false}'
mutate B1 old-text "$Q" \
  'text: <>Press the <b>pin</b> button, or <b>F</b>, and the list becomes' 'text: <>Press <b>Pin list</b> and the list becomes'
test -z "$(git status --porcelain -- src)" || { echo "STOP: src not restored"; git status --short -- src; exit 1; }
npm run build:dev > reports/qc-v1401/runs/mut-clean-build.log 2>&1 || { echo "STOP: clean build failed"; exit 1; }
echo DONE
