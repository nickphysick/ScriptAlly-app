#!/bin/zsh
# Query Centre v138.6 — the SOURCE mutations (breaks that live in compiled code), run in the measurement worktree.
# usage: tests/e2e/qcV1386Mutate.sh <A1|A2|A3|A4|C1> <base url, e.g. http://127.0.0.1:4491>
# Each: back the file up to a path-derived name, break it, run its lock (expected RED), restore, rebuild.
# A1's lock is a unit test (src/components/shell/pinList.test.ts); the others are rendered (qcV1386.measure.ts).
# ⚠️ Run only in a worktree whose src/ holds nothing uncommitted: the restore is from the backup, never from git.
set -o pipefail
LOCK=$1; BASE=$2
MUT=${TMPDIR:-/tmp}/qc1386-mut; mkdir -p $MUT
case $LOCK in
  A1) F=src/components/agents/AgentList.tsx ;;
  A2|A3|A4) F=src/components/shell/useFullScreenList.ts ;;
  C1) F=src/components/agents/AgentList.tsx ;;
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
if lock == "A1":   # the Contact list binds its own F again
    sub("      if (!hk && !find && !down && !up && !openK && !actK && !letGo) return;",
        "      const fullK = matchesShortcut(SHORTCUTS.contactsFull, e);\n      if (fullK) { e.preventDefault(); setFull(!full); return; }\n      if (!hk && !find && !down && !up && !openK && !actK && !letGo) return;")
elif lock == "A2": # Esc unpins first: the pin's layer above every popover and panel
    sub("  useEscapeLayer(full, () => setFull(false), ESC_LEVEL.pageMode);", "  useEscapeLayer(full, () => setFull(false), ESC_LEVEL.drawerPopup + 1);")
elif lock == "A3": # one shared key for both pages
    sub('export const PIN_KEYS: Record<PinPage, string> = { queries: "sa.pinList.queries", agents: "sa.pinList.agents" };',
        'export const PIN_KEYS: Record<PinPage, string> = { queries: "sa.pinList.shared", agents: "sa.pinList.shared" };')
elif lock == "A4": # don't restore the scroll position
    sub("    const y = back.current;", "    const y = 0;")
elif lock == "C1": # measure the letter jump against the old pinned row (its 76 + the 40 headings), not the sticky stack.
    # ⚠️ The break is in `landUnder`, the step that decides where the row ends: breaking only the jump's first estimate
    # (stickTop) is corrected by landUnder and left the lock green (measured).
    sub("    const stickTop = labels ? parseFloat(getComputedStyle(labels).top) || 0 : 12;", "    const stickTop = 76;")
    sub("      const line = labels ? labels.getBoundingClientRect().bottom : sc.getBoundingClientRect().top + 12;",
        "      void labels; const line = sc.getBoundingClientRect().top + 76 + 40;")
open(p, "w").write(s)
EOF
[ $? -eq 0 ] || { cp "$BK" "$F"; echo "STOP: the break did not apply"; exit 1; }
if [ $LOCK = A1 ]; then
  npx vitest run src/components/shell/pinList.test.ts > $MUT/run-$LOCK.txt 2>&1
  RC=$?
else
  npm run build:dev > $MUT/build-$LOCK.txt 2>&1 || { cp "$BK" "$F"; echo "STOP: the broken build failed"; exit 1; }
  SA_E2E_BASE_URL=$BASE npx playwright test tests/e2e/qcV1386.measure.ts -g "$LOCK · " --reporter=line --workers=1 > $MUT/run-$LOCK.txt 2>&1
  RC=$?
fi
cp "$BK" "$F"
[ $LOCK = A1 ] || npm run build:dev > $MUT/rebuild-$LOCK.txt 2>&1
git diff --quiet -- "$F" || { echo "STOP: $F did not come back to HEAD"; exit 1; }
grep -E "✗|AssertionError|FAIL" $MUT/run-$LOCK.txt | head -6
echo "$LOCK mutation: exit $RC ($([ $RC -ne 0 ] && echo RED || echo GREEN))"
