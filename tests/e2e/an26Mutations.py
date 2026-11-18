"""
Analytics v26 — the AN26 locks' named mutations, applied to the source for one red run, then put back with
`git checkout -- <files>` in the measurement worktree (never the primary checkout).

    python3 tests/e2e/an26Mutations.py apply     # every mutation below, each asserting it matched exactly once
    python3 tests/e2e/an26Mutations.py files     # the files it touches (for the revert)

Each lock's mutation is the brief's. C1's also lifts the partition guard, which would otherwise throw and blank the page
(a red, but every lock's at once).
"""
import sys

M = [
    ("A1", "Render a local header", "src/components/QueryAnalytics.tsx",
     "            <A26Header loading=",
     "            <header data-a26=\"local\"><h1><span data-a26=\"title\">{dayOne ? \"Analytics\" : `${sent} queries, ${replies} replies`}</span></h1></header>\n            <A26HeaderOff loading="),
    ("A1", "(the local header's off switch)", "src/components/QueryAnalytics.tsx",
     "const ACTIVE_MS_KEY = \"scriptally_active_manuscript_id\";",
     "const ACTIVE_MS_KEY = \"scriptally_active_manuscript_id\";\nconst A26HeaderOff: React.FC<Record<string, unknown>> = () => null; void A26Header;"),
    ("B1", "Always show the beyond card", "src/lib/analyticsV26.ts",
     "if (t.beyond.length > 0 && t.slowest !== null) out.push",
     "if (t.slowest !== null) out.push"),
    ("B2", "Show findings at 4 replies", "src/lib/analyticsV26.ts",
     "export const EVERYDAY_REPLIES = 5;",
     "export const EVERYDAY_REPLIES = 4;"),
    ("C1", "Count offers under being read", "src/lib/analyticsV26.ts",
     "  if (e.row.reachedOffer) return \"offer\";",
     "  if (e.row.reachedOffer) return \"reading\";"),
    ("C1", "(lift the partition guard)", "src/lib/analyticsV26.ts",
     "    throw new Error(\"analyticsV26.nowGroups: the four groups disagree with outcomes\");",
     "    void 0;"),
    ("C2", "Measure each bar against the row above", "src/components/analytics/A26What.tsx",
     "{path.map((p) => (",
     "{path.map((p, i) => ("),
    ("C2", "(the row above)", "src/components/analytics/A26What.tsx",
     "style={{ width: `${(p.count / sent) * 100}%`",
     "style={{ width: `${(p.count / (i ? path[i - 1].count || 1 : sent)) * 100}%`"),
    ("D1", "Sort by date added", "src/lib/analyticsV26.ts",
     "(a.row.sentMs as number) - (b.row.sentMs as number) || a.row.id.localeCompare(b.row.id)",
     "a.row.id.localeCompare(b.row.id)"),
    ("D2", "Group by any genre on the agent", "src/lib/analyticsV26.ts",
     "const f = Array.isArray(g) ? g.find((x) => typeof x === \"string\" && x.trim()) : undefined;",
     "const f = Array.isArray(g) ? g[g.length - 1] : undefined;"),
    ("E1", "Place replies by days / 10", "src/lib/analyticsV26.ts",
     "id: e.row.id, weeks: weeksOf(e.replyDays as number),",
     "id: e.row.id, weeks: Math.max(1, Math.round((e.replyDays as number) / 10)),"),
    ("E2", "Attribute every reply to the first nudge", "src/lib/analyticsV26.ts",
     "      const r = replies.find((t) => t > n && t <= next);",
     "      const r = i === 0 ? replies[0] : undefined; void next;"),
    ("F1", "Inline 6 as a literal", "src/components/analytics/A26Compare.tsx",
     "<b data-a26=\"most-v\">{b.typical}{b.unit}</b>",
     "<b data-a26=\"most-v\">{b.key === \"rate\" ? 6 : b.typical}{b.unit}</b>"),
    ("G1", "Add likely to a foot line", "src/components/analytics/A26Better.tsx",
     "<p>Rounds with queries still waiting can still go up.</p>",
     "<p>Rounds with queries still waiting can likely still go up.</p>"),
    ("G1", "(and to an Early foot, so every state carries it)", "src/components/analytics/A26Long.tsx",
     "<p>The top row fills in with your first reply.</p>",
     "<p>The top row will likely fill in with your first reply.</p>"),
    ("H1", "Count the example marks", "src/components/analytics/A26Bits.tsx",
     "<span className=\"a26-mk a26-mk--xs\" aria-hidden=\"true\" data-a26=\"key-mark\">",
     "<span className=\"a26-mk a26-mk--xs\" aria-hidden=\"true\" data-a26=\"key-mark\" data-a26-mark=\"example\">"),
    ("L1", "Fix a card to 1400px wide", "src/components/analytics/a26.css",
     ".a26-page .a26-rc { padding: 8px;",
     ".a26-page .a26-rc { min-width: 1400px; padding: 8px;"),
]

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "files":
        print(" ".join(sorted({m[2] for m in M})))
    elif cmd == "apply":
        for lock, name, path, old, new in M:
            s = open(path).read()
            n = s.count(old)
            if n != 1:
                raise SystemExit(f"{lock} {name}: matched {n} times in {path}")
            open(path, "w").write(s.replace(old, new))
            print(f"applied {lock}: {name}")
    else:
        raise SystemExit(__doc__)
