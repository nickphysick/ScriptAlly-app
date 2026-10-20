#!/bin/bash
# Query Centre v141 — prove each QC141 lock red against its named break. Run in a MEASUREMENT worktree only (never the
# primary checkout): every source break is backed up by its PATH ($BK/<path with / as ->), built with build:dev,
# measured against the preview on $PORT, and put back from that backup — never with git.
# Writes reports/qc-v141/mutations.jsonl, one line per break: the lock, the break, and whether the lock went red.
set -u
PORT=${PORT:-4543}
OUT=reports/qc-v141/mutations.jsonl
BK=${BK:-/tmp/qc141mut}
mkdir -p "$BK" reports/qc-v141/runs
[ -z "${ONLY:-}" ] && : > "$OUT"
only() { [ -z "${ONLY:-}" ] || [[ " $ONLY " == *" $1 "* ]]; }

# mutate <lock> <name> <file> <python-old> <python-new>
mutate() {
  local lock=$1 name=$2 file=$3 old=$4 new=$5
  only "$name" || return 0
  local bak="$BK/$(echo "$file" | tr / -)"
  cp "$file" "$bak" || { echo "STOP: no $file"; exit 1; }
  python3 - "$file" "$old" "$new" <<'PY' || { cp "$bak" "$file"; echo "STOP: $name did not apply"; exit 1; }
import sys
p, a, b = sys.argv[1:4]
s = open(p).read()
assert s.count(a) == 1, f"{a!r} found {s.count(a)} times"
open(p, "w").write(s.replace(a, b))
PY
  if ! npm run build:dev > "reports/qc-v141/runs/mut-$name-build.log" 2>&1; then
    cp "$bak" "$file"; echo "{\"lock\":\"$lock\",\"break\":\"$name\",\"red\":null,\"note\":\"build failed\"}" >> "$OUT"; return
  fi
  QC141_MUTATE="src-$name" SA_E2E_BASE_URL=http://127.0.0.1:$PORT npx playwright test tests/e2e/qcV141.measure.ts --reporter=line --workers=1 -g "$lock ·" > "reports/qc-v141/runs/mut-$name.log" 2>&1
  local code=$?
  cp "$bak" "$file"
  local first=$(grep -m1 -E "✗" "reports/qc-v141/runs/mut-$name.log" | sed 's/"/\\"/g' | cut -c1-220)
  echo "{\"lock\":\"$lock\",\"break\":\"$name\",\"red\":$([ $code -ne 0 ] && echo true || echo false),\"first\":\"$first\"}" >> "$OUT"
  echo "$lock $name exit $code"
}

SUM=src/lib/qcSummary.ts
F138=src/lib/qc138.ts
WH=src/components/queries/centre/QcWhere141.tsx
CSS=src/components/queries/centre/qcv141.css

mutate L1 drop-closed "$SUM" \
  'for (const r of rows) out[whereItStands(r)] += 1;' 'for (const r of rows) { const k = whereItStands(r); if (k !== "closed") out[k] += 1; }'
mutate L2 overdate-you-quiet "$F138" \
  'if (skip !== "where" && f.where && whereItStands(r) !== f.where) return false;' \
  'if (skip !== "where" && f.where && whereItStands(r) !== f.where && !(f.where === "quiet" && r.court === "you" && r.expectedMs != null && r.expectedMs <= now)) return false;'
mutate L3 card-own-state "$WH" \
  '}> = ({ counts, total, heard, heardPct, where, onPick }) => {' \
  '}> = ({ counts, total, heard, heardPct }) => { const [where, setW] = React.useState<WhereKey | null>(null); const onPick = (k: WhereKey) => setW((x) => (x === k ? null : k));'
# the export's "filtered" is the applied chips (Queries.tsx: filtered: qc140Chips.length > 0); drop the set's chip
mutate L4 export-ignores src/lib/qc140.ts \
  'if (f.where) out.push({ key: `where:${f.where}`, label: WHERE_LABEL[f.where].label, off: (g) => ({ ...g, where: null }) });' ''

mutate L5 default-attention src/lib/qcViewMemory.ts \
  'export const DEFAULT_QC_GROUP: GroupBy = "status";' 'export const DEFAULT_QC_GROUP: GroupBy = "attention";'
mutate L6 nr-shared src/lib/qcBandArt.ts \
  '[QueryStatus.NO_RESPONSE]: "nr", ' ''
mutate L7 no-column "$CSS" \
  '.qc140-jo { display: grid !important; grid-template-columns: 32px minmax(0, 1fr) auto; column-gap: 10px; }
.qc140-jo .qc141-jmc { position: relative; display: grid; place-items: center; width: 32px; height: 24px; }' \
  '.qc140-jo { display: grid !important; grid-template-columns: 0 minmax(0, 1fr) auto; column-gap: 0; }
.qc140-jo .qc141-jmc { position: relative; display: grid; place-items: center; width: 0; height: 24px; }'
mutate L8 no-tight src/components/queries/centre/QcBand140.tsx \
  'for (const f of ["", "tight", "tighter"] as Fit[]) {' 'for (const f of [""] as Fit[]) {'
mutate L9 fixed-220 "$CSS" \
  'box-sizing: border-box; width: 100%; height: auto; max-height: var(--hero-stack-h);' 'box-sizing: border-box; width: 100%; height: 220px; max-height: none;'
echo MUTATIONS-DONE
