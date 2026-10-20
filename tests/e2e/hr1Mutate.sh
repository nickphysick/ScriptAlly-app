#!/bin/bash
# Header rules v1.1 — prove each HR1 lock red under its named break. Run in the MEASUREMENT worktree only.
# The page-side breaks run through HR1_MUTATE (CSS injected after load, nothing on disk changes). The one source break
# (HR1-2: the Query Centre's stage tabs rendered again) is backed up by its PATH and put back from that backup — never
# with git — then the clean build is rebuilt. Writes reports/header-rules-v1/mutations.jsonl.
set -u
PORT=${PORT:-4522}
OUT=reports/header-rules-v1/mutations.jsonl
mkdir -p reports/header-rules-v1/runs /tmp/hr1mut
: > "$OUT"
run() { # run <lock> <break> <grep>
  local lock=$1 name=$2 g=$3
  HR1_MUTATE="$lock" SA_E2E_BASE_URL=http://127.0.0.1:$PORT npx playwright test tests/e2e/hr1.measure.ts --reporter=line --workers=1 -g "$g" > "reports/header-rules-v1/runs/mut-$name.log" 2>&1
  local code=$?
  local first=$(grep -m1 -E "✗ $lock" "reports/header-rules-v1/runs/mut-$name.log" | sed 's/"/\\"/g' | cut -c1-200)
  echo "{\"lock\":\"$lock\",\"break\":\"$name\",\"red\":$([ -n "$first" ] && echo true || echo false),\"exit\":$code,\"first\":\"$first\"}" >> "$OUT"
  echo "$lock $name exit $code red:$([ -n "$first" ] && echo yes || echo no)"
}
for pair in "HR1-1:hero-top-plus-6" "HR1-3:responses-left-hardcoded" "HR1-4:art-plus-20" "HR1-5:right-pinned-to-gutter" "HR1-6:gap-54" "HR1-7:discover-title-plus-4"; do
  run "${pair%%:*}" "${pair#*:}" "HR1-1…7"
done
run "HR1-8" "out-of-scope-moved-6" "HR1-8"

# HR1-2 · the stage tabs back (a source break)
F=src/components/queries/centre/QcHeader138.tsx
BAK="/tmp/hr1mut/$(echo "$F" | tr / -)"
cp "$F" "$BAK" || { echo "STOP: no $F"; exit 1; }
python3 - "$F" <<'PY' || { cp "$BAK" "$F"; echo "STOP: HR1-2 break did not apply"; exit 1; }
import sys
p = sys.argv[1]; s = open(p).read()
a = '''        stands" does its job, and the eyebrow is the first thing under the sheet's top. GlyphRow stays, unmounted. */}
'''
assert s.count(a) == 1
s = s.replace(a, a + '''    <div className="qc138-srow phf-row" data-qc138="status-row">
      <GlyphRow counts={loading ? null : counts} stages={stages} onGlyph={onGlyph} loading={loading} />
    </div>
''')
open(p, "w").write(s)
PY
if npm run build:dev > reports/header-rules-v1/runs/mut-stage-tabs-build.log 2>&1; then
  HR1_MUTATE="HR1-2" SA_E2E_BASE_URL=http://127.0.0.1:$PORT npx playwright test tests/e2e/hr1.measure.ts --reporter=line --workers=1 -g "HR1-1…7" > reports/header-rules-v1/runs/mut-stage-tabs.log 2>&1
  code=$?
  first=$(grep -m1 -E "✗ HR1-2" reports/header-rules-v1/runs/mut-stage-tabs.log | sed 's/"/\\"/g' | cut -c1-200)
  echo "{\"lock\":\"HR1-2\",\"break\":\"stage-tabs-back\",\"red\":$([ -n "$first" ] && echo true || echo false),\"exit\":$code,\"first\":\"$first\"}" >> "$OUT"
  echo "HR1-2 stage-tabs-back exit $code"
fi
cp "$BAK" "$F"
test -z "$(git status --porcelain -- src)" || { echo "STOP: src not restored"; git status --short -- src; exit 1; }
npm run build:dev > reports/header-rules-v1/runs/mut-clean-build.log 2>&1 || { echo "STOP: clean build failed"; exit 1; }
echo DONE
