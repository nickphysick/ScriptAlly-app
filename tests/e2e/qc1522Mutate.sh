#!/usr/bin/env bash
[ -n "${HEAVY_SLOT_TOKEN:-}" ] || exec node "$(git rev-parse --show-toplevel)/scripts/heavy-slot.mjs" run -- bash "$0" "$@"  # one heavy job at a time: the test slot (scripts/heavy-slot.mjs)
# Query Centre v152.2 — proves each QC1522 lock red (tests/e2e/qc1522.measure.ts):
#
#   bash tests/e2e/qc1522Mutate.sh L1 L6 …   each lock against its named break: a page break (PAGE_MUT in the spec: L2 L3 L4
#                                             L5 L8), or a SOURCE break below, applied to this tree, built, run, and restored
#                                             from a backup named by path (never `git checkout`)
#
# Ledgers go to reports/qc-v152-2/ledger/mut-<lock>-*.json; a lock is proved when its ledger has a red row.
set -u
cd "$(dirname "$0")/../.." || exit 1
BK=/tmp/qc1522-mut-$$; mkdir -p "$BK"
F=""
restore() { local f="$1"; cp "$BK/$(echo "$f" | tr '/' '-')" "$f"; }
build() { npx vite build --mode emulator --outDir dist-emu --emptyOutDir > "$BK/build.txt" 2>&1 || { echo "build failed"; [ -n "$F" ] && restore "$F"; exit 1; }; }
spec() { echo "QC1522_MUTATE=$1 QC1522_ONLY=${1%[A-Z]} node scripts/emu-e2e-inner.mjs tests/e2e/qc1522.measure.ts --project=measure --workers=1"; }
# a source break: <file> <from> <to> (the anchor must occur exactly once)
srcbreak() {
  local f="$1"; local b="$BK/$(echo "$f" | tr '/' '-')"
  cp "$f" "$b"
  python3 - "$f" "$2" "$3" <<'PY'
import sys
p,a,b=sys.argv[1:4]; s=open(p).read()
assert s.count(a)==1, "mutation anchor not found once: "+a
open(p,'w').write(s.replace(a,b))
PY
}
for L in "$@"; do
  F=""
  case "$L" in
    L1) F=src/lib/qc1522.ts; srcbreak $F '  { key: "package", label: "Package", line: "Which submission package you sent", pro: true },' '  { key: "package", label: "Package", line: "Which submission package you sent", pro: true },
  { key: "none" as never, label: "No grouping", line: "One list" }, /* MUT L1 */' ;;
    L6) F=src/components/queries/centre/QcPage151.tsx; srcbreak $F '<span className="qc1512-nl"><b>{r.agentName}</b></span>' '<span className="qc1512-nl"><b>{r.agentName}</b>{qs === "quiet" ? <span className="qc1512-tag">Gone quiet</span> : null}</span>{/* MUT L6 */}' ;;
    L7) F=src/lib/qc1522.ts; srcbreak $F 'export const waitWords = (days: number): string => (days <= 0 ? "Same day"' 'export const waitWords = (days: number): string => (days <= 0 ? "0 days later" /* MUT L7 */' ;;
    L9) F=src/components/queries/centre/QcCard152.tsx; srcbreak $F 'return <div key={it.key} className={`qc1522-lt ${it.side}`}' 'return <div key={it.key} className={`qc152-w qc1522-lt ${it.side}`} /* MUT L9 */' ;;
    L10) F=src/components/queries/centre/QcComposer1522.tsx; srcbreak $F '  const save = async (p: ComposerSave) => { if (busy) return; await onSave(p); };' '  const [seen, setSeen] = useState(false); /* MUT L10: a "See what changes" step */
  const save = async (p: ComposerSave) => { if (busy) return; if (!seen) { setSeen(true); return; } await onSave(p); };' ;;
    L11) F=src/components/queries/centre/QcComposer1522.tsx; srcbreak $F '  const up = (to: () => void) => { if (dirty) { setConf(true); return; } to(); };' '  const up = (to: () => void) => { to(); }; /* MUT L11: closes without asking */' ;;
    L12) F=src/components/queries/centre/QcComposer1522.tsx; srcbreak $F '  const [note, setNote] = useState("");' '  const [note, setNote] = useState("Thank you for the offer, but"); /* MUT L12 */' ;;
    L13) F=src/components/queries/centre/QcComposer1522.tsx; srcbreak $F '  { k: "more", label: () => "Something else", status: QueryStatus.PARTIAL_REQUESTED },' '  { k: "more", label: () => "Something else", status: QueryStatus.PARTIAL_REQUESTED },
  { k: "more" as never, label: () => "You nudged", status: QueryStatus.QUERIED }, /* MUT L13 */' ;;
    L14) F=src/components/queries/centre/QcComposer1522.tsx; srcbreak $F '{primary("Done", { j: "tell", told, later: false }, "done", nt < c.others.length)}' '{primary("Done", { j: "tell", told, later: false }, "done", false)}{/* MUT L14 */}' ;;
    L15) F=src/lib/qc1522Write.ts; srcbreak $F '  const p = planFix(c, [], [passId], null);' '  const p = planFix(c, [], [], null); void passId; /* MUT L15: the pass stays */' ;;
    L16) F=src/components/queries/centre/QcCard152.tsx; srcbreak $F '        if (p.editingId && it.activityId === p.editingId && p.editNode) return <React.Fragment key={it.key}>{p.editNode}</React.Fragment>;' '        if (p.editingId && p.editNode) return it.activityId === p.editingId ? <React.Fragment key={it.key}>{p.editNode}</React.Fragment> : null; /* MUT L16: the whole history */' ;;
    L17) F=src/lib/qc1512.ts; srcbreak $F '(r as { closeLeads?: boolean }).closeLeads === false' '(r as { closeLeads?: boolean }).closeLeads !== false /* MUT L17: swapped */' ;;
  esac
  build
  bash tests/e2e/qc152Run.sh "$(spec $L)"; echo "MUT-DONE-$L"
  [ -n "$F" ] && restore $F
done
build; echo "rebuilt this tree into dist-emu"
