#!/bin/bash
# Query Centre v141.1 — prove each QC1411 lock red against its named break. Run in a MEASUREMENT worktree only (never the
# primary checkout): every source break is backed up by its PATH ($BK/<path with / as ->), built with build:dev,
# measured against the preview on $PORT, and put back from that backup — never with git.
# Writes reports/qc-v141-1/mutations.jsonl, one line per break: the lock, the break, and whether the lock went red.
set -u
PORT=${PORT:-4547}
OUT=reports/qc-v141-1/mutations.jsonl
BK=${BK:-/tmp/qc1411mut}
mkdir -p "$BK" reports/qc-v141-1/runs
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
  if ! npm run build:dev > "reports/qc-v141-1/runs/mut-$name-build.log" 2>&1; then
    cp "$bak" "$file"; echo "{\"lock\":\"$lock\",\"break\":\"$name\",\"red\":null,\"note\":\"build failed\"}" >> "$OUT"; return
  fi
  QC1411_MUTATE="src-$name" SA_E2E_BASE_URL=http://127.0.0.1:$PORT npx playwright test tests/e2e/qcV1411.measure.ts --reporter=line --workers=1 -g "$lock ·" > "reports/qc-v141-1/runs/mut-$name.log" 2>&1
  local code=$?
  cp "$bak" "$file"
  local first=$(grep -m1 -E "✗" "reports/qc-v141-1/runs/mut-$name.log" | sed 's/"/\\"/g' | cut -c1-220)
  echo "{\"lock\":\"$lock\",\"break\":\"$name\",\"red\":$([ $code -ne 0 ] && echo true || echo false),\"first\":\"$first\"}" >> "$OUT"
  echo "$lock $name exit $code"
}

SUM=src/lib/qcSummary.ts
NW=src/lib/nudgeWindow.ts

# L1 — v141's sets: Gone quiet from the reply date
mutate L1 v141-quiet "$SUM" \
  'return p === "nudge" ? "you" : p === "close" ? "quiet" : "agent";' 'return p === "wait" ? "agent" : "quiet";'
# L2 — one more day of nudge window, inside whereItStands only
mutate L2 plus-one-day "$SUM" \
  '  const p = nudgePhase(r, nowMs);' '  const p = r.expectedMs != null && nowMs > r.expectedMs && (nowMs - r.expectedMs) / 86_400_000 <= 29 ? "nudge" : nudgePhase(r, nowMs);'
# L3 — ≤ for < at either edge
mutate L3 lte-at-reply-date "$NW" \
  'const past = r.expectedMs != null && r.expectedMs < nowMs;' 'const past = r.expectedMs != null && r.expectedMs <= nowMs;'
mutate L3 gte-at-window-end "$NW" \
  'if ((past && over > CLOSE_OVER_DAYS)' 'if ((past && over >= CLOSE_OVER_DAYS)'
# L4 — an in-window nudge counted as both With you and Gone quiet
mutate L4 double-count "$SUM" \
  'for (const r of rows) out[whereItStands(r, nowMs)] += 1;' 'for (const r of rows) { const k = whereItStands(r, nowMs); out[k] += 1; if (k === "you" && courtOf(r.status as QueryStatus) === "agent") out.quiet += 1; }'
echo MUTATIONS-DONE
