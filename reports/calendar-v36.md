# Calendar — v36

## Phase 0 · recon (read-only)

Baseline recorded first: **tsc RED** (1 error, `tests/e2e/msProfileEmpty.measure.ts:189`) and
**vitest RED** (1 failed / 7292 passed / 425 files, `workspacePageGrid.test.tsx`). Both belong to
another session — `msProfileEmpty.measure.ts` and `seedEmptyManuscript.mjs` are UNTRACKED and
`src/lib/bookVersions.ts` is modified; the failing spec imports nothing of this pack's. Proved by
reading. Nothing moved.

Worktree/bundle assertion green before any measurement. Measured at 1440 across all three ranges.

### ⚠️ A PROBE FAULT FOUND BEFORE ANY PREMISE WAS BELIEVED

The first run of the recon reported **three identical readings for three different ranges**. The
range control is an `<input type="range">` and every workspace page stays MOUNTED, so
`document.querySelector` returned a hidden page's copy and the dispatch changed nothing. It did not
error — it reported on nothing and passed quietly, which is the standing rule this pack carries.
The probe now requires **exactly one visible control** and throws otherwise. Every number below is
from the repaired probe.

### The seven premises

**1 · The clipped-fill lie — CONFIRMED, with numbers.** `fillFor` computes
`(todayAt − sg.from) / (sg.goal − sg.from)` where `sg.from` is the piece's DRAWN start, clamped to
the window's left edge by `cutPieces`, which begins every run at 0. So a stretch that opened before
the window reports a fraction of what shows:

| row | 1 month | 3 months | 6 months |
|---|---|---|---|
| Rachel Lin | **20%** | **41%** | 41% |
| Tom Ellery | 25% | 47% | 55% |
| Wren Ashcombe *(the near fixture)* | 89% | 96% | 98% |

One query, one day, three answers. And the near fixture crosses its own threshold as you change
range. **The fix belongs in the fill call** — confirmed: `cutPieces` and the draw path are both
about what is VISIBLE, correctly; only `fillFor`'s inputs are wrong.

**2 · Ellery's passed end — INVERTED.** Ellery renders `quiet(100%) out(25%)` with BOTH lanes
labelled ("Quiet for 31 days", "Out since 27 Jul · reply expected 21 Sept") — two queries on one
agent row, not one bar swallowing another. The row that renders as a hollow outline is **Ottoline
Frayn**, and it carries its label ("Full req · 865 days ago") at .75 opacity, which is what the ref
asks for. Its whole run is hollow because its named end is 865 days ago — *before the window's left
edge* — so every visible pixel genuinely is past the named date. **There is no solid stretch to
draw, because none of it is visible.** Phase 8's Ellery clause is held pending this report.

**3 · The deed table — INVERTED.** Every status whose side is `yours` has an entry:
`Partial Requested`, `Full Requested`, `Revise & Resubmit`, `Offer`. There are no others.
**No row on the board renders the generic** — the buttons today are TICK IT OFF, ANSWER THEM,
SEND THE FULL, SEND THE PARTIAL, SEND THE REVISION, NUDGE OR CLOSE IT.

⚠️ **But the generic branch IS reachable, by a route the brief did not name.** The group comes from
`rowGroupOf` over ALL a row's queries (the earliest group any of them earns); `rowNote` reads the
**lead** query (the most advanced status). A row in `now` because query B is writer-held, whose
lead query A is agent-held with no nudge due and no passed expectation, falls through to the
generic. That is the same lead-vs-all mismatch this pack's predecessor fixed at the predicate
level and left in the copy. The fix is to read the query that PUT the row in its group.

**4 · O'Rourke's grouping — INVERTED.** `queryGroup` already does what the brief asks:
`if (f.nudgeYmd && f.nudgeYmd <= today) return "now"` fires only on a reminder that HAS fallen due,
and the next line sends a future reminder to `soon`. No row on today's board sits in `Needs you
now` on a future reminder. **Held pending this report** — if O'Rourke is doing it on Nick's own
data, the cause is not this branch.

**5 · Marsh's marker — CONFIRMED, and the lock is worse than "range coverage".** Markers overlap
bars on **6 row-pairs at 1 month, 13 at 3 months and 24 at 6 months** — including Marcus Reed,
Priya Nair, Peter Vance, Cormac Bligh, Tobias Quint and Ellery. The previous lock could never see
any of them: it measured a gap **only when the two boxes did not intersect**
(`if (mr.left > br.right || br.left > mr.right)`), so an overlapping pair was skipped before it was
measured. It was not under-ranged; it was vacuous — it excluded exactly the case that fails.
⚠️ Note this is a horizontal box-intersection reading: a marker sits ON its join by design and the
3px halo is what separates the inks. The fix must state which of the two it means before it can be
locked.

**6 · `remind` sampling and `in`/`bang` fixtures — CONFIRMED, carried.** `remind` renders on Imogen
Farr with label "Nudge due" and a fill of 12%; the sweep's text sample is still null at some widths
because the fit pass drops it. `in`/`bang` remain unseeded.

**7 · `o'r` — not a defect.** Confirmed: `o'r` and `example` are real dev task titles. No lock, no
fix, no mention beyond this line.

**Red gate: not triggered.** Nothing implicates derivation below the view layer.
