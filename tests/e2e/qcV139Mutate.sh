#!/usr/bin/env bash
# Query Centre v139 — the source mutations for the QC139 locks. Run from the worktree root, with a preview of this
# worktree's dist/ on $PORT (default 4501):
#
#   tests/e2e/qcV139Mutate.sh A2       # break A2's subject, rebuild, run A2, restore, rebuild
#
# Each break is a literal replacement in one or two files; the originals are kept under /tmp/qc139mut/ with a name
# derived from the PATH (two files differing only in case are one file on this machine). A replacement that does not
# match is a STOP — a mutation that changes nothing proves nothing.
set -euo pipefail
LOCK="${1:?lock}"
PORT="${PORT:-4501}"
BK=/tmp/qc139mut; mkdir -p "$BK"
FILES=()
patch() { # file, old, new
  local f="$1"; local key; key="$(echo "$f" | tr '/' '-')"
  [ -f "$BK/$key" ] || cp "$f" "$BK/$key"
  FILES+=("$f")
  python3 - "$f" "$2" "$3" <<'EOF'
import sys
p, a, b = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(p).read()
if s.count(a) != 1: sys.exit(f"STOP: {p}: the break matched {s.count(a)} times")
open(p, "w").write(s.replace(a, b))
EOF
}
restore() { for f in "${FILES[@]}"; do cp "$BK/$(echo "$f" | tr '/' '-')" "$f"; done; }
trap restore EXIT

Q=src/components/Queries.tsx
case "$LOCK" in
  A2) # tick from the step card's button, and not from the real events
    patch "$Q" '    if (k === "resp") { startWalkRef.current(); return true; }' '    tickGuide.current(k); if (k === "resp") { startWalkRef.current(); return true; }'
    patch "$Q" '  useEffect(() => { if (routeActive && narrowed) tickGuide.current("find"); }, [routeActive, narrowed]);' '  useEffect(() => { void narrowed; }, [routeActive, narrowed]);'
    patch "$Q" '  useEffect(() => { if (routeActive && realPanel) tickGuide.current("open"); }, [routeActive, realPanel]);' '  useEffect(() => { void realPanel; }, [routeActive, realPanel]);'
    patch "$Q" '  useEffect(() => { if (routeActive && beOpen) tickGuide.current("birds"); }, [routeActive, beOpen]);' '  useEffect(() => { void beOpen; }, [routeActive, beOpen]);' ;;
  B1) # save Pip through the real write
    patch src/components/queryActions/journeys/ResponseJourney.tsx '      if (isPracticeId(q.id)) {
        const extra' '      if (false && isPracticeId(q.id)) {
        const extra'
    patch src/components/queryActions/QueryDrawer.tsx '    if (isPracticeId(r.queryId)) {
      try {' '    if (false && isPracticeId(r.queryId)) {
      try {' ;;
  B2) # fork the journey: Pip's opens another journey's screens
    patch src/components/queryActions/QueryDrawer.tsx '  const J = JOURNEYS[active.mode];' '  const J = isPracticeId(active.queryId) ? JOURNEYS.nudge : JOURNEYS[active.mode];' ;;
  B3) # no tick on clear
    patch "$Q" '      tickGuide.current("resp");
      setPipLeaving(true);' '      setPipLeaving(true);' ;;
  B4) # keep Pip on cancel
    patch "$Q" '    } else {
      endPractice();
      setPipLeaving(false);
      reopenGuide();' '    } else {
      setPipLeaving(false);
      reopenGuide();' ;;
  B5) # inject Pip into the store the page counts
    patch "$Q" '    logNudge, setQueryPackage, updateUserPaths} = useScriptAllyDb();' '    logNudge, setQueryPackage, updateUserPaths, queries: __dbQueries} = useScriptAllyDb();'
    patch "$Q" '    queries,
    collectionsReady,' '    collectionsReady,'
    patch "$Q" '  const { showConfirm, showToast } = useToast();' '  const { showConfirm, showToast } = useToast();
  const __pipQ = useSyncExternalStore(subscribePractice, currentPractice, () => null);
  const queries = React.useMemo(() => (__pipQ ? [__pipQ.query, ...__dbQueries] : __dbQueries), [__pipQ, __dbQueries]);'
    patch "$Q" 'import { PIP_AGENCY, PIP_AGENT_LINE, PIP_ID, PIP_NAME, currentPractice, endPractice, isPracticeId, startPractice, usePractice } from "../lib/practiceQuery";' 'import { PIP_AGENCY, PIP_AGENT_LINE, PIP_ID, PIP_NAME, currentPractice, endPractice, isPracticeId, startPractice, subscribePractice, usePractice } from "../lib/practiceQuery";' ;;
  C1) # change the stored key
    patch src/lib/qcListMemory.ts 'const GROUPS: readonly GroupBy[] = ["attention", "status", "action", "package", "none"];' 'const GROUPS: readonly GroupBy[] = ["status", "action", "package", "none"];'
    patch src/lib/qcListMemory.ts 'export const QC_LIST_DEFAULTS: QcListMemory = { density: "comfortable", group: "attention" };' 'export const QC_LIST_DEFAULTS: QcListMemory = { density: "comfortable", group: "status" };' ;;
  C2) # leave the hourglass
    patch src/components/queries/centre/QcList138.tsx '                  const art = bandArtOf(groupBy, g.key);' '                  const art = null as ReturnType<typeof bandArtOf>; void bandArtOf;' ;;
  *) echo "no source break for $LOCK"; exit 2 ;;
esac

npm run build:dev > /tmp/qc139mut-build.log 2>&1 || { echo "STOP: the mutated build failed"; tail -20 /tmp/qc139mut-build.log; exit 3; }
set +e
SA_E2E_BASE_URL="http://127.0.0.1:$PORT" npx playwright test tests/e2e/qcV139.measure.ts --reporter=line --workers=1 -g "$LOCK ·" > "reports/qc-v139/runs/mut-$LOCK.log" 2>&1
echo "mutation $LOCK: exit $?"
grep -E "^\s+[0-9]+ (passed|failed|skipped|did not run)" "reports/qc-v139/runs/mut-$LOCK.log"
grep -E "✗" "reports/qc-v139/runs/mut-$LOCK.log" | cut -c1-240 | head -8
set -e
restore; trap - EXIT
npm run build:dev > /tmp/qc139mut-build.log 2>&1
echo "restored and rebuilt"
