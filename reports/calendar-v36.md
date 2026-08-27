# Calendar — v36

**DEPLOYED to dev, hosting only, at `93cf648a`** — verified by bundle hash:
`https://scriptally-dev.web.app` serves `/assets/index-lcej-TgG.js`, the file that build produced.
No throwaway worktree was needed at deploy time: no other session held uncommitted `src/`.

⚠️ **FIVE OF NINE PHASES LANDED. Phases 3, 4 and 5 — the surface, the sticky rail and the past
wash — are NOT BUILT, and neither is the rest of Phase 8.** That is a scope call, not an
oversight: the correctness phases came first because the brief said so, and Phase 2 alone took
four wrong anchors and three broken probes to get right. Shipping an unverified 42px rail whose
tick alignment I could not measure would be worth less than saying it is not there. What did land
is verified at three widths and three ranges with a clean console.

| phase | state |
|---|---|
| 0 recon | ✅ committed alone |
| 1 the ref | ✅ v36 in, v35 deleted |
| 2 the honest fill | ✅ landed, locks proved red |
| 3 surface and layout | ❌ not built |
| 4 the rail | ❌ not built |
| 5 the past, set back | ❌ not built |
| 6 ordering | ✅ landed |
| 7 deeds, groups, count | ✅ landed |
| 8 residuals | ◐ the vacuous clearance lock is repaired to a census; Ellery and the marker fix are not |
| 9 verify | ✅ for what landed — 13/13 at 1280 / 1440 / 1920 |

Gates: **tsc 0 in owned files · production build 0 · vitest 425 files, 7303 passed, 3 skipped, 0
failed** — better than baseline, which carried a tsc error and a vitest red from another session's
untracked work (proved by reading; since resolved by them).

Commits: `69672d61` recon · `bfb7ea0f` ref · `fe78c1bd` fill · `fc7b39e8` deeds ·
`16ba3fe5` ordering · `93cf648a` load state.

---

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


---

## The answers, in order

### 3 · The clipped-fill ratio, before and after

| row | before (1m / 3m / 6m) | after |
|---|---|---|
| Rachel Lin | **20 / 41 / 41 %** | 41 / 41 / 41 |
| Tom Ellery | 25 / 47 / 55 | 100 / 100 / 100 |
| Devendra Rao | 31 / 54 / 59 | 73 / 73 / 73 |
| Wren Ashcombe *(the near fixture)* | 89 / 96 / 98 | 93 / 93 / 93 |

All nine rows carrying a live fill are now identical at every range. **Four anchors were tried and
three were wrong**, each hiding the next: the piece's start taken only where clipped (a bar is
*always* drawn from the edge); the piece's start rather than the run's (pieces break at every drawn
node, most of which change no hands); `lastStatusChange` (the stamp for when the *status* began, not
the *wait*). The answer is the date the goal is already measured from — the latest send — so
numerator and denominator come from one date and the window can reach neither.

### 4 · Locks proved vacuous, and what they became

- **The marker-clearance lock.** It measured a gap *only where the two boxes did not intersect*, so
  an overlapping pair was skipped **before** it was measured. Not under-ranged, as the brief
  supposed — vacuous, excluding exactly the case that fails. **Now a reported census** (48
  neighbouring pairs at 1280/1440, 50 at 1920) rather than a lock, because *"a marker is crowded"*
  has no pinned definition: a marker sits ON its bar by design and the 3px halo is what separates
  the inks. **This is the one ruling I need from you** — see §5.
- **The fill lock, twice.** Both the unit and rendered forms were proved red by deleting the fix
  (35 / 58 / 74 and 20/41/41 respectively), then green with it.
- **"Groups never reorder under any sort"** failed on LONGEST WAITING — **correctly**.
  `timelineRows` returns one flat list in the view's order and the *page* buckets it by
  `GROUP_ORDER`; the flat list's ranks were never meant to be monotonic. The claim that *is* the
  contract now sits on the rendered board.
- **A red for the wrong reason is not a proof.** The generic-deed lock's first red was
  `rowNote is not defined` — a missing import. The import was added and the red re-taken.

### 5 · Values needed but not pinned

**One, and it blocks a lock rather than a build: the definition of marker clearance.** The halo is
pinned at 3px in the card colour; what is not pinned is what a marker must be clear *of*. It sits on
its own bar by design, so the only meaningful claim concerns *neighbouring* bars — and the repaired
sweep reports large negative gaps against bars the marker's midpoint is outside, which is either a
real crowding fault or a wrong reading of what a neighbour is. I declined to pin a threshold,
because choosing one would be inventing the definition rather than measuring against it.

### 6 · Unverifiable remainder; cross-session

**Unexercised, each named rather than left as a silent null**
- **`Recently closed` never renders** — no closure falls inside the window on the harness account —
  so its new collapsed-by-default state is unit-locked and not rendered-locked.
- **`remind` text colour** is still unsampled at some widths (the fit pass drops that family's
  label). Reported by the sweep every run.
- **`in` / `bang` markers** remain unseeded; the fixture set has `outk` and `clock` only.
- **Ellery's passed end** is held pending the recon's inversion (see premise 2): the row already
  renders full-and-labelled on both lanes, and the hollow row that does exist carries its label.

**Known, still reproducing, untouched as instructed:** uppercase agent names in dev data, the
pane's `.tpn ws` squeeze, `nudge_overdue` as a stored task type.

**Cross-session:** `main` moved during the run; six commits, `--only` throughout, verified after
each that only my paths landed. A probe fault is worth carrying forward: the range control is an
`<input type="range">` and every workspace page stays mounted, so `querySelector` returns a hidden
page's copy — the first recon reported three identical readings for three different ranges without
erroring. Every range-dependent probe now requires exactly one **visible** control and throws
otherwise.

**One cosmetic thing I noticed and did not fix:** the control row now wraps `RANGE` and its
readout onto two lines at 1440, because the FULL BOARD / RIGHT NOW toggle took the width. It is in
Phase 3's territory, which is not built.
