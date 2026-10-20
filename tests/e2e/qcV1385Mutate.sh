#!/bin/zsh
# Query Centre v138.5 — the SOURCE mutations (the breaks that live in compiled code), run in the measurement worktree.
# usage: tests/e2e/qcV1385Mutate.sh <B2|C2|E1|G1> <base url, e.g. http://127.0.0.1:4481>
# Each: back the file up to a path-derived name, break it, build, run its lock (expected RED), restore, rebuild.
# ⚠️ Run only in a worktree whose src/ holds nothing uncommitted: the restore is from the backup, never from git.
set -o pipefail
LOCK=$1; BASE=$2
MUT=${TMPDIR:-/tmp}/qc1385-mut; mkdir -p $MUT
case $LOCK in
  B2) F=src/components/queries/centre/QcHeader138.tsx ;;
  C2) F=src/lib/qcSentWeeks.ts ;;
  E1) F=src/components/Queries.tsx ;;
  G1) F=src/components/Queries.tsx ;;
  *) echo "unknown lock $LOCK"; exit 2 ;;
esac
BK=$MUT/${F//\//-}
cp "$F" "$BK" || exit 1
python3 - "$LOCK" "$F" <<'EOF'
import sys
lock, p = sys.argv[1], sys.argv[2]
s = open(p).read()
def sub(old, new):
    global s
    assert s.count(old) == 1, (lock, old[:60])
    s = s.replace(old, new)
if lock == "B2":   # the glyphs keep their own state
    sub("  const on = pressedGlyph(stages);\n  return (\n    <div className=\"qc138-gl\"",
        "  const [own, setOwn] = React.useState<GlyphKey | null>(null); void pressedGlyph; void stages;\n  const on = own;\n  return (\n    <div className=\"qc138-gl\"")
    sub("disabled={loading} onClick={() => onGlyph(g.key)} style",
        "disabled={loading} onClick={() => { void onGlyph; setOwn((o) => (o === g.key ? null : g.key)); }} style")
elif lock == "C2": # Sunday-start weeks: a Sunday counts in the week after
    sub("isoWeekStart(new Date(t)).getTime()", "isoWeekStart(new Date(t + 86_400_000)).getTime()")
elif lock == "E1": # the old row stays under the header
    sub("      <i ref={qc138Ref} hidden />",
        "      <QcFilters138 filters={qcF138} onFilters={setQcF138} pop={qc138Pop} stageCounts={qc138Counts.stage} dueWeekN={qc138Counts.dueWeek} offersN={qc138Counts.offers} sentOptions={qc138Counts.sent} moreN={qc138Counts.more} showing={qcVisible.length} msTitle={qcLineTitle} />\n      <i ref={qc138Ref} hidden />")
elif lock == "G1": # unpin always expands
    sub("  useEffect(() => (qcFull && routeActive ? holdSidebarCollapsed() : undefined), [qcFull, routeActive]);",
        "  useEffect(() => { void holdSidebarCollapsed; if (!qcFull) return undefined; document.querySelector<HTMLElement>('[aria-label=\"Collapse sidebar\"]')?.click(); return () => { document.querySelector<HTMLElement>('[aria-label=\"Expand sidebar\"]')?.click(); }; }, [qcFull]);")
open(p, "w").write(s)
EOF
[ $? -eq 0 ] || { cp "$BK" "$F"; echo "STOP: the break did not apply"; exit 1; }
npm run build:dev > $MUT/build-$LOCK.txt 2>&1 || { cp "$BK" "$F"; echo "STOP: the broken build failed"; exit 1; }
SA_E2E_BASE_URL=$BASE npx playwright test tests/e2e/qcV1385.measure.ts -g "$LOCK · " --reporter=line --workers=1 > $MUT/run-$LOCK.txt 2>&1
RC=$?
cp "$BK" "$F"
npm run build:dev > $MUT/rebuild-$LOCK.txt 2>&1
git diff --quiet -- "$F" || { echo "STOP: $F did not come back to HEAD"; exit 1; }
grep -E "✗" $MUT/run-$LOCK.txt | head -8
echo "$LOCK mutation: exit $RC ($([ $RC -ne 0 ] && echo RED || echo GREEN))"
