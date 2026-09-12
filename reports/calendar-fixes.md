# Calendar — four fixes

**Commit** `c42beb93` (code, locks and the ref) on `main`, plus this report.
**Measured against** a local `vite preview` of `npm run build:dev` at main's tip, 12 Sep 2026, in a
detached worktree at `/Users/nickphysick/ScriptAlly-cal`. **Not deployed.**
**Ref** `design-refs/query-calendar-header-v1.html` → `70b2e426af43cc…c09c`, enrolled on the
staleness watchlist (58 refs guarded). Normative for §3 only; its board sketch is illustrative.

---

## False premises in the brief

Each of these is stated because acting on it literally would have produced a different — and in two
cases wrong — fix. None of them changes what was asked for.

**1 · "The row is `auto 1fr auto`."** It was `auto minmax(0, 340px) auto` with
`justify-content: space-between`. A previous pass had already deviated from the ref's `1fr` on
purpose and says so at the value: `1fr` is `minmax(auto, 1fr)`, so each flank took
`(board − 340 − 24) / 2` and the range ran *under* the search at every width below ~1538. The brief
was describing the ref, not the build. The fix restores `1fr` — which is now safe, because the left
flank is no longer a variable.

**2 · "A Playfair 19px date range."** 19px is the ref's own `.r-long`. The build rendered it at
**26px**, and the range measured **292.72px** rather than the ref's ~210. The diagnosis was right
and the number was three-quarters of the problem.

**3 · "v65 draws a past bar in its state colour at `opacity .34`."** It does not, in any of its
renderings. v65's `.jc{background:var(--cs-past)}` resolves to `transparent` in all four of its
colour schemes, and its DEFAULT — `body[data-past="ghost"]`, which is what the artefact ships with —
is `background:#fff` at **.32**. `.34` appears nowhere in it. The build matched v65 exactly. So §1
is **a ruling, not a restoration**: the artefact that states it is the header ref written today,
whose note says *"its own state colour, faded — not white, not grey"*. Built as asked; recorded so
nobody looks for the v65 rendering it came from.

**4 · "Three are regressions against v65's own behaviour."** One is. **§2 is** — v65's today line
is `z-index: 40` and the build had dropped it to 3. **§1 is not** (see above). **§4 is not a
regression against v65 either**: it is a divergence between the two hosts that mount the same
board, and To-do was the correct one throughout.

**5 · "It is being painted behind cards."** Not at rest. Measured at 1440 by sampling the painted
pixels in a 6px strip over the line: **46 dark pixels through a resting card**. It is painted behind
a **hovered** card — 0 dark pixels — which is always the card being read. The distinction decides
the fix: what was needed was a z above the hover ladder, not a stacking-context repair.

**6 · "the likelier cause — the stacking context it lives in must not be created inside a lane."**
It is not created inside a lane, on either host. Every ancestor of the line was walked and reported:
`.tl-rowsin`, `.tl-rows`, `.tl-wrap`, the zone and the board are all `position: static/relative`
with `z-index: auto`, no transform, no filter, no `will-change`, no isolation. The bar's own chain
is the same until the bar itself. **The suspected cause was absent.**

**7 · "it grows and squeezes the centre until things overlap."** True, and a probe that measures the
three CELLS reports a clean page at every width: the cells never intersect. What overlapped is the
**control inside the collapsed cell** — `.qcc-calhead-r` carried `min-width: 0`, so its track
resolved to 211.6px at 1440 while the view switch in it is 342.6px, and `justify-content: flex-end`
put the surplus over the search. Any lock written against cells would have gone green.

**8 · "the same leaf component the cards and list use."** There is no shared leaf component. There
are three sizings — `.qcc-leaf` 46px on the card, `.qlv-leaf` 40px in the list, `.qbv-leaf` on the
board — over one shared derivation, `CardLeaf`. The header's is a fourth sizing on the same shape;
the month table (`MON`) is the cards' own, so nothing here is a second list of month names.

**9 · "Match the behaviour the board's other marks already use … with a short delay in and out."**
The board's existing mechanism has **no delay**. The grace is new, so this changed To-do's behaviour
as well as the Query Centre's: a bar merely crossed no longer names itself. Stated because it is a
change to a page the brief only asked to hold still.

**10 · `reports/calendar-fixes.md` was deleted first and written last**, as asked. The file it
replaces was the August calendar round's; it is recoverable at `aef24f73`.

---

## §1 · Historic bars render in their own colour, faded

### The diagnosis the brief asked for

The same historic bar, on both hosts, at 1440:

| | class | `background-color` | `opacity` | `data-st` |
|---|---|---|---|---|
| To-do | `tl-jc` | `rgb(255, 255, 255)` | `0.32` | — |
| Query Centre | `tl-jc` | `rgb(255, 255, 255)` | `0.32` | — |

**They match, so the fault is in the BOARD** — `todoCalendar.css`'s `.tl-jc`, which both hosts mount
— **not in the Queries host.** To-do therefore changes too, and §5 enumerates every difference that
makes.

### What it is now

`.tl-jc` reads `background: var(--st, #fff)`, and `--st` is mapped from a `data-st` the stage
publishes from `stateFor(a.status ?? QUERIED)` — **the same call the card that opens from that stage
is already built from**, so the fill and the card cannot come to disagree about which state a stage
was. The five states map each to their own token; the fallback is the old white, so a stage whose
status does not map is drawn as it always was rather than as a transparent box.

It is an **attribute, not the `tl-st-*` class**, deliberately: that class carries a `background` of
its own for the status *band*, declared 180 lines later in the sheet, so using it here would have
filled the stage by source order rather than by rule.

Measured after, both hosts, 1440 — the fill equals the state token to the byte:

```
qc   §1: 2 stages, states {"queried":1,"you":1}   hovered: opacity 1, z 12 against neighbours 2
todo §1: 2 stages, states {"you":1,"queried":1}   hovered: opacity 1, z 12 against neighbours 2
tokens: queried #f7efe3 · agent #e0e5dd · you #f5e6df · offer #d7e0e8 · closed #e4e1db
```

Rest `.34`, hover `1`, hover z `12` against a neighbouring bar's `2`. The fill does not move on
hover — only the opacity, which is asserted, because a fill that changed under the pointer would be
a second signal.

⚠️ **The state tally is printed, not asserted.** This account holds two past stages in two different
states; a fixture that drifted to one state would prove one branch of five and pass. Which states
exist is the fixture's business, so the tally is reported and read.

Shots: `calendar-fixes-shots/{qc,todo}-stage-rest.png`, `…-stage-hovered.png`.

---

## §2 · The today line sits above the bars

### The ancestor walk

No ancestor creates a stacking context, on either host — the full chain, from the line up to the
page grid:

```
qc    .tl-rowsin(rel/auto) · .tl-rows(rel/auto) · .tl-wrap(rel/auto) · .tl-zone(static)
      · .tl-board(rel/auto) · .qcc-cal-boardcol · .qcc-cal · .qcc-plain     — none
todo  .tl-rowsin(rel/auto) · .tl-rows(rel/auto) · .tl-wrap(rel/auto) · .tpl-zone(rel/auto)
      · .tl-boardpane(isolation: isolate) · .tl-cal.tl-board · .tl-page     — the isolate is ABOVE
                                                                              the bars too
```

A bar's own chain is identical until the bar itself, which is `position: absolute; z-index: 2` with
a transform. So the line and the cards compete directly on z-index, and the trap the brief suspected
is not there.

### What was actually happening

`z-index: 3` cleared a resting card (2) and lost to **`.tl-p:hover` (5)** and **`.tl-jc:hover`
(12)**. Measured as paint, in a 6px strip over the line, at 1440:

| | at rest | hovered |
|---|---|---|
| before (z 3), qc | 46 dark px | **0** |
| before (z 3), todo | 31 dark px | **0** |
| after (z 20), qc | 46 | 46 |
| after (z 20), todo | 31 / 45 | 32 |

**20 is above the lane and below the furniture.** The lane's ladder tops out at `.tl-jc:hover`'s 12
(`.tl-act` 6, `.tl-p:hover` 5, `.tl-p` 2, `.tl-jc`/`.tl-leadin` 1); the sticky group bar is 25 and
the rail 50, and the line passes under both by the board's own idiom. v65 uses 40, which would sit
*above* the group bar — v64 deliberately moved the line under it, and that decision stands.

### ⚠️ Deviation: the assertion the brief asked for cannot be satisfied on a correct page

> *`elementFromPoint` at the today line's x … returns the today line … and not the bar.*

The line is `pointer-events: none` — decoration that must never swallow a click meant for a card —
so it is absent from hit testing **by design**, and `elementFromPoint` returns the bar whether the
line is above it or beneath it. Written as asked, that case fails on a correct page and on a broken
one alike. This repo already records the same trap on the marketing hero's firework.

**What is asserted instead is the paint**, which is the claim "sits above the bars" actually makes,
and it is strictly stronger: it reads the rendered pixels rather than the DOM stack. Proved red by
restoring `z-index: 3` — *"the hovered card covers the today line"*, with the rest case still green,
which is exactly the distinction.

Shots: `calendar-fixes-shots/{qc,todo}-todayline-crossing.png`.

---

## §3 · The header cannot collide

### Before — the overlap, measured

At 1100 / 1280 / 1440 / 1920, the gap between the search's right edge and the view switch's left
edge (negative = overlap):

```
1100  −250.63      1280  −188.94      1440  −108.94      1920  +132.35
```

The cells did not intersect at any width; the **switch overflowed its own cell**. At 1100 the search
was squeezed to **38px** and the switch's cell to **24.6px** while the switch itself was 290.6px.

### After

```
        range    search   views   control gaps (all negative = clear)      row height / tallest
1100    110.03    95.97   136     lc −22    cr −22     lr −139.97          44.42 / 44.42
1280    110.03   103.39   342.58  lc −22    cr −22     lr −147.39          44.42 / 44.42
1440    110.03   263.39   342.58  lc −22    cr −22     lr −307.39          44.42 / 44.42
1920    110.03   340.00   342.58  lc −223.69 cr −223.70 lr −787.39         44.42 / 44.42

range width spread across the four widths: 0.00px
```

Every assertion the brief named: the three columns' rects do not intersect (cells **and** controls);
the row's height equals one control's height, so nothing wrapped; the search is ≤ 340 and > 0; the
range is identical at all four widths.

### The three parts of the fix

- **The range is two calendar leaves** — `windowLeavesOf(visible)` beside the sentence the winbar
  states, reconciled against it in a unit case over five windows so the two cannot name different
  days. 44px boxes, a `→` between, the ref's type and its sand month strip.
- **The centre is the only track told it may reach zero** — `auto minmax(0, 1fr) auto`, with the
  search at `width: min(340px, 100%)`. The width is a **ceiling**; the search shrinks first.
- **`min-width: 0` is gone from both flanks.** That declaration on the right cell is what let the
  track collapse under the control standing in it.

**Below 1180 the switch goes icon-only**, which is what closes the arithmetic at the narrow end: at
1100 the board column is 470px, and leaves + chevrons (188) + two 22px gaps + a labelled switch
(290.6) leaves the search **−41px**. Dropping the four labels takes the switch to 136 and the search
to 96. `font-size: 0` removes the words and leaves the accessible name where it was — asserted, at
every width.

### Two consequences, both named

- **The month strip is `#f7efe3` as a literal, and deliberately not `var(--state-queried)`, which is
  the same value.** A card's leaf reads `--band-a`, the query's own state, because it is a date *in*
  a state. A window boundary is in no state, so reading the token would tell a reader — in the one
  vocabulary this app reserves for it — that the last day of October is queried.
- **`--qcc-cal-above` is 211 (was 208).** The leaves are 44.42 tall against the sentence's 42.3, so
  the header grew 2.12px and the board ran that far past the scrollport's foot. This was a *masked*
  red: it only surfaced once the stale well assertions in front of it were repaired. Second time
  that guard has caught this drift, which is the argument for the guard rather than for the number.

The sentence survives as the h3's `aria-label`, so a reader without the picture still gets
`30 July – 27 October 2026`, from the one place it is composed.

Shots: `calendar-fixes-shots/header-{1100,1280,1440,1920}.png`.

---

## §4 · The caveat flag opens on hover, not click

### The cause

The Query Centre passed `onRowsOver={() => {}}` and `onRowsOut={() => {}}` to the board and set the
pairing from `pickSeg` instead — so on that page the Caveat label and its button opened on a
**click**, and the same click opened the query. Measured before, at 1440:

```
Query Centre   rest 0  →  hover 0  →  click 1
To-do          rest 0  →  hover 1
```

### The fix

`useSegHover` is To-do's own mechanism, lifted to `shared/timeline/` and mounted by both hosts;
neither page now declares its own `segOf` or holds a hover state of its own, and `pickSeg` selects
and opens without touching the reveal. The grace is `SEG_HOVER_DELAY_MS = 120`, in **and** out, so a
bar merely crossed never names itself and a gap crossed between two bars never clears one.
`:focus-within` reveals the mark too — `opacity: 0` never took the button out of the tab order, so
before this a Tab landed on an invisible control with `pointer-events: none`.

Measured after, both hosts:

```
qc    rest 0 → hover 1 (label opacity 1)   focus: label 1, button 1, focused true
todo  rest 0 → hover 1 (label opacity 1)   focus: label 1, button 1, focused true
before, todo focus: label 0, button 0
```

Leaving hides it again (after the grace), and the mark carries no click handler of its own.

⚠️ **One existing lock was retargeted for the grace rather than left to flake.** `calHover65` waited
150ms for the reveal to clear against a 120ms grace — 30ms from an intermittent red that the next
session would chase as a product fault. It now waits `SEG_HOVER_DELAY_MS + 250`; the law is
unchanged, and the constant is exported for exactly this.

---

## §5 · To-do against today's reference

The reference was captured from **unmodified HEAD, today**, before any edit — the board's DOM is
date-bound and a reference carried between runs makes the next session read a date shift as damage.
It lives in `reports/calendar-fixes-ref/todo-{board,winbar}-{1280,1440,1920}.html`.

```
1280   winbar byte-identical · board identical but 2 `data-st` on 2 stages
1440   winbar byte-identical · board identical but 2 `data-st` on 2 stages
1920   winbar byte-identical · board identical but 2 `data-st` on 2 stages
geometry (board, winbar, rows, rail) unchanged at every width, within 0.5px
```

**The difference is expected and enumerated**, per §1's diagnosis: the fault was in the board, the
two hosts measured identical, so To-do changes with the Query Centre. The only permitted difference
is the state a past stage now publishes, and the case asserts both that the normalised DOM is equal
**and** that the attribute count equals the stage count and is greater than zero — so a comparison
that proved nothing cannot pass.

One more expected difference, in a different lock: `elemDiff`'s ref-against-dev list gained
`ghost stage:bg — ref rgb(255,255,255), dev rgb(245,230,223)`. It is now a **named deviation** with
its reason, so the list is back to its baseline six entries.

---

## Red before green

The whole measurement was run against **unmodified HEAD** before the fix. Eight of eight cases red,
each on the fault it guards:

```
§1 qc / todo   a stage carries no state at all          (states {"(none)":2})
§2 qc / todo   the hovered card covers the today line   (46/31 dark at rest → 0 hovered)
§3             at 1100 the header's cr controls intersect by 38px
§4 qc          hovering a bar reveals nothing — the reveal still needs a click
§4 todo        focusing the mark does not reveal its label
§5             0 state attributes against 2 past stages at 1280
```

⚠️ **§3's overlap assertion was masked on the first attempt** — *"the range is not two leaves"* fired
first and the overlap was never asked, while the printed numbers showed the switch sitting 38px
inside the search. The overlap assertions were moved **above** the leaf ones and the case re-run
against HEAD; the quoted red is from that run. The repo's own rule: one red can hide an arbitrary
number behind it.

Source locks proved red by mutation, then restored:

- `calendarTokens` — the today line at 3 fails on `.tl-p` (5); at 30 fails on the group bar (25).
  Both directions, so the lock states a relation rather than a number.
- `calFixes` §1 — `background: #fff` restored: *"stage … is rgb(255, 255, 255), not its queried
  token #f7efe3"*.

⚠️ **One mutation did NOT redden, and that is a finding rather than a gap.** Putting `min-width: 0`
back on `.qcc-calhead-r` changes nothing now: with the leaves at 110px instead of 292.7px there is
room in the row, so the track never has to collapse. `min-width: 0` was a *contributing* cause, not
the whole one — the wide flank was. The source lock forbidding it stands as a guard against the pair
recurring together; the measured claim is the overlap itself.

---

## Locks — no worse than baseline

Every red below was re-run at **`c42beb93^`** (the commit before this one) and reproduced with a
byte-identical message. All are date-bound fixture drift on the shared harness account: today's
fractional position in a rolling window, and which records happen to be late.

| file | red | at `c42beb93^` |
|---|---|---|
| `calFid63` | a bar ends 4.98px from the line | same |
| `calCentre` | [1920/3 months] today is 14.8px off the lane's centre | same |
| `calAccept55` | [1920] today is 14.8px off the lane's centre | same |
| `calFaults56` | a card with no future end runs past today | same |
| `calTint54` ×2 | no card carries a tint / nothing says overdue | same |
| `calV40` ×2 | the row has lost a column / today is −8.2px off centre | same |
| `calWindow58` ×3 | the step is a no-op / no No-response chip / no non-owed row | same |
| `elemDiff` | 6 differences | same 6 (the new one is named) |
| `correctionPreview` (unit) | does not report a consequence… | same |

**Green after, and previously red:** `qcCalLayout` (3 cases) and `qcCalendar` (1) — see below.

**Green throughout:** `qcCalRail`, `qcCalToday`, `qcCalRefdiff`, `qcCalendarParity`, `calHover65`,
`calAct63`, `calBehav63`, `calCard65`, `calSeam65`, `calDens64`, `calCaps58`, `calFlags60`,
`calGhost56`, `calGround54`, `calTask63`, `calFidelity60`, `diffList`, and the new `calFixes`.

### ⚠️ Four pre-existing reds repaired, because they were mine and they were wrong

`qcCalLayout` and `qcCalendar` asserted that the Board and the Calendar have **no well**, while
reading `.qcc-plain` — the wrapper **every** view sits on. The Grid pass renamed `.qcc-well` to
`.qcc-plain` mechanically, *including inside the `well` reading*, so one selector was asserted
present and absent in the same case, and four cases went red claiming the Calendar had a well it
cannot have. They ask for the retired class by name now, and assert the claim the app makes: no view
has a well, every view sits on the plain ground. Behind them sat the `--qcc-cal-above` overshoot
above — a red that could not be seen until the one in front of it was fixed.

---

## Gates

```
tsc --noEmit                 0 errors
vite build                   clean — no error and no warning line (grepped, not tailed)
vitest run                   479 files · 7914 passed | 3 skipped · 1 red (correctionPreview,
                             pre-existing at clean HEAD in an isolated worktree)
npm run build:dev            clean, in the measurement worktree, before every run
```

`git status` was read after the commit and showed nothing left staged or modified under `src/`,
`tests/` or `design-refs/`.

⚠️ **Another session was editing `src/components/Queries.tsx` concurrently** (the empty-states pack).
Its hunks were identified and kept out: the measurement build was assembled from HEAD plus this
run's six hunks only, and the commit went in after that session had landed `4b6d39d2`, so the diff
staged here is this run's alone. Nothing was moved, stashed or checked out in the shared tree.

## Not done

- **Not deployed.** Dev still serves what it served this morning.
- The three date-bound fixture reds above (`calCentre`/`calAccept55`/`calFid63`/`calFaults56`,
  `calTint54`, `calV40`, `calWindow58`) are a standing set that wants a seeding pass, not a fix in
  this run. They are about which records the harness account holds, not about the board.
- **The board's interior was not redesigned**, as instructed. `.tl-jc` keeps its anatomy — same box,
  same border, same medallion — and only its fill and its opacity moved.
