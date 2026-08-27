# The Calendar — Porcelain (v35)

**DEPLOYED to dev, hosting only, from a throwaway worktree at `28482744`** — verified by bundle
hash: `https://scriptally-dev.web.app` serves `/assets/index-DTxHSXgs.js`, which is the file that
build produced. The worktree was used because another session held uncommitted `src/`
(`db.tsx`, `types.ts`, `OverviewPane.tsx`, `bookProfile.css`, `manuscriptProfile.ts`,
`containers.test.tsx`) at deploy time; nothing of theirs was moved, staged or built from.

Ref: `design-refs/timeline-v35.html` (committed, hash-locked). Commits: `9be6a2b6` · `55ae24ea` ·
`fdb1c466` · `28482744`.

---

## 1 · Deployed or not, and why

Deployed. Gates green in the primary tree at the tip: **tsc 0 · production build 0 · vitest 424
files, 7270 passed, 3 skipped, 0 failed** — better than this run's baseline, which carried one red
(`workspacePageGrid.test.tsx`, over another session's then-uncommitted `illustratedMasthead.css`;
that session has since committed and the red cleared). The acceptance is **6/6 at 1280, 1440 and
1920 with a clean console**.

Condition 4 did not block: it required deploying from a throwaway worktree rather than the primary
tree, which is what happened.

---

## 2 · The Phase 0 ledger

Measured on the deployed board before anything was touched, element by element, against the ref.

**Counts: 12 never-built · 7 regressed · 10 invented.**

### The three loudest — all *invented*, and all for one reason

The standing house rule is *colours from the code, never the mockup*. These three elements had
**no code token at all**, so "read the colour out of the code" resolved to "invent one at 3am":

| | measured on dev | ref | 
|---|---|---|
| **the blue decide bar** | `#cbd9e8` fill, `#9db6cf` line | `#eccbba` fill, `#e2b8a5` line |
| **the yellow reminder band** | `#fff8e5` fill | `#eef1ec` fill, `#dde3da` line |
| **the saturated hatch** | `#e0e0e0`/`#d6d6d6` at −45°, 6px | `#e7e3dc`/`#f4f1ec` at −55°, 5px |

A blue bar and a yellow band on a board with no other blue and no other yellow. This is why the
brief suspended the colour rule for this territory and pinned every value — and the suspension was
right: the rule that produced the fault was the rule being suspended.

### The rest

**Invented (10):** the three above plus `#8e5252` (text on four states), `#787878` (text on
three), `#a3a3a3` (quiet line), `#c9a89e` (the notch), `#eae2d6` (a tinted board under white
bars), and the scrawl at `#7c3a2a` instead of `#8a4a36`.

**Regressed (7):** bar height 44px against 22 · bar radius `0px` except on caps, against 999 ·
row min-height 40 against 47 · row surface `#fdfaf5` against `#fffefb` · a *tinted* board ground ·
chip ink `rgb(63,90,61)` and height 26 against 23 · **and a dead branch in the focus band** —
`} else if (selItem) {  } else if (selItem) {`, from `b2e51e3e` on 26 Aug, which made the second
unreachable, so selecting a chip populated nothing for a fortnight. Fixed.

**Never-built (12):** the fill mechanic entire · the white track · circled markers · the 3px halo ·
the action column · group sentences · six groups (four existed) · one column header (a 7-day grid
header existed) · the portalled tooltip · the crosshair · the Right-now view · the ≥85% step.

---

## 3 · Refs deleted in Phase 1

Eleven, in the same commit as the new one, because the ref itself says it supersedes every earlier
timeline ref and eleven drawings of one surface is eleven ways to build to the wrong one:

`timeline-bar-treatments` · `timeline-edge-cases` · `timeline-event-catalogue` · `timeline-grouped`
· `timeline-journey-bars` · `timeline-marker-grammar` · `timeline-rails` · `timeline-range` ·
`timeline-settled` · `timeline-urgency` · `timeline-week-ref`

Every citation of them was inside this pack's own files (verified by grep **before** the deletion)
and is repointed. `154-timeline.html` and `156-nudge-timeline.html` were **not** touched: they draw
the reading pane's QueryTimeline, a different surface.

---

## 4 · What retired with the pulse, the notch, the chips and the mode control

- **The pulse** — `@keyframes tlUrge`, `.tl-seg.s-y3`'s animation, `--bar-urgent-fill` (the
  reduced-motion stand-in), and `.tl-row.closed .tl-seg { animation: none }`. Position replaced
  motion, so the reader who asked for no motion is no longer left with **no signal at all**.
  **The reduced-motion block now has nothing to guard but two transitions**, and a lock asserts
  it names no animation.
- **The notch** — `.tl-wp`, `--dash`, and with them the whole `Waypoint` / `WaypointKind` type
  (`expected` · `reminder` · `deadline` · `snooze` · `overrun`). A filling bar means a date exists,
  an empty one means nobody set it, and the bar terminates on the date either way: three statements
  of one fact. The captions were **not** lost — they ride the tooltip, where they survive the long
  ranges at which labels drop out.
- **`hatchPct` and `OVERRUN_SPAN`** — the hollow run-on says the same thing in one element, for
  every family rather than one. The hatch survives on `quiet` alone.
- **The kind chips AND `TimelineView.kinds`** — the field went with the control. Leaving it set to
  "all" would have left a filter nothing could reach and nothing could clear.
- **The 1-week and 2-week ranges**, and `DEFAULT_RANGE_INDEX` moved to 3 months.
- **The `Upcoming only` mode control** was **already gone** before this pack — only comments
  mention it. Its dedupe-leak lesson is carried instead into the Right-now round-trip check, which
  asserts **by identity, not by count**: two lists of equal length can name different rows, which
  is exactly how that leak survived.
- **The grid itself** — `.tl-grid`, `.tl-cell`, `.tl-dh`, `.tl-corner`, `--tl-cols`, the weekday
  initials, the past/weekend washes and every gridline. Measured: **0 gridlines** at all three
  widths.

---

## 5 · Fill ends: which exist in real data today

All three named-end sources are reachable without a new read or a new stored field — each was
already read to place a waypoint. Precedence: **agency's stated window → send-by the agency asked
for → the writer's own reminder**. The first two are *one resolved date* (`resolveExpectedDate`)
named for whichever side holds the move, so treating them as separate candidates would be a second
derivation of one fact; the reminder is the genuine third and is a **fallback, not a peer** — a
date the agency stated outranks one the writer set for themselves.

On the harness account at 1440, 3 months, the board's 29 bars:

| | count |
|---|---|
| bars with a named end and a live fraction | 5 (`8%`, `41%`, `47%`, `49%`, `54%`) |
| bars full (finished stretch, or past their named end) | 24 |
| bars with **no** named end — no fill element at all | 0 |
| hollow run-ons past a passed date | 6 |

**⚠️ Two states this fixture cannot exercise, said plainly rather than passed over:** `nearBars: 0`
(nothing on this account sits between 85% and 100% today) and the hollow label's `.75` opacity
(every hollow piece here is unlabelled). Both are covered by unit tests over `fillFor` instead —
the threshold, both clamps, the historical case, and the degenerate zero-span that would otherwise
divide by zero and hand the browser a `NaN` width it silently drops.

---

## 6 · Values I needed that were not pinned

**None.** Every value came from the brief's pinned list or the ref. One **conflict** to report,
which is the inverse of the question asked:

**The ref's `Recently closed` sentence says "Kept for a month, then it leaves." The constant is
`CLOSED_LINGER_DAYS = 7`.** Shipping the ref's wording would have put a false claim on the page —
and it would have arrived looking already approved, because it came from a normative artefact.
The sentence is **derived from the constant** so the two cannot disagree, and renders *"Kept for a
week, then it leaves."* A lock asserts the derivation, and separately that the words "a month" do
not appear while the constant is not 30.

**Whether a closure should linger a week or a month is yours to decide** — changing the constant to
make a sentence true is deciding a retention policy by typography. One constant either way.

---

## 7 · What remains unverifiable; cross-session observations

### Unverified
- **The `near` step and the hollow label's opacity on a rendered page** (see §5). Unit-covered.
- **`in` and `bang` markers** — this fixture produced only `outk` and `clock`. Both are asserted
  where present and their tokens are locked; neither is *drawn* proof.
- **The `Recently closed` group** — no closure fell inside the window, so the group did not render.
- **The crosshair's date against a computed day** — the crosshair is pointer-driven and was
  verified by construction (it reads the pointer's fraction of the lane through the same expression
  that places the bars) rather than by a synthetic mousemove. Flagged as the one Phase 8 item taken
  on reasoning rather than measurement.
- **The scrollbar**, as always: Chromium follows the macOS setting and nothing overrides it.

### Found on the way — three defects, none of them by reading
1. **A TDZ crash.** `board` is a `useMemo` running during render, calling `asksOfYou` → `actionFor`
   declared below it. The whole page fell into its error boundary through a **clean `tsc`**.
   Caught by `todoPageSmoke`, which is the reason that smoke exists.
2. **A deleted bar.** The named-end waypoint was still a `break` while the bar now *ends* on that
   date, so `cutPieces` reserved clearance either side of the bar's own terminus and the stretch
   came back too narrow to draw — a row vanished entirely.
3. **The action column empty on every row** (14 dashes, 0 buttons) and **`quiet` drawn hollow so
   its hatch never painted**. Both found by the acceptance on its first complete run.

### And two faults in my own checks, which are the more useful record
- **A backtick inside a `page.evaluate` template literal** ended the string; three cases died with
  `plbl is not defined` — a probe reporting a missing element about an element that was there.
- **The first clipping lock was vacuous.** `scrollWidth > clientWidth` is the obvious check, and on
  an inline element both are meaningless and happen to be *equal*: removing the fix left it
  **green**. Rewritten to measure ink against the clipping ancestor, then proved red naming all six
  offenders before being believed. *A lock that cannot redden on the page it was written for is not
  proved safe — it is unproved.*

### Cross-session
- Two other sessions committed to `main` during this run; `main` moved three times. Nothing of
  theirs was moved, staged or reverted. An early `.refhashes.json` collision resolved itself when
  they committed.
- **The brief asked for one commit per phase and got four.** Phases 2–7 are the same two files, and
  every intermediate split leaves a tree that does not compile — `journeyBars.ts` alone carries the
  fill engine (P3), the marker faces (P5) and the bar-end rule (P4). Stated rather than pretended
  otherwise.
- **`tests/e2e/worktreeAssert.mjs` is new** (the brief's precondition; it did not exist). It asks
  the **server** what it serves rather than reading `dist/` off disk, which is what `bundleGuard`
  does — a preview started before a rebuild leaves the disk check green and the measurement wrong.
  HEAD against an intended commit, the served bundle proven to contain named needles.

### Known, still reproducing, untouched (as instructed)
`.tpn .ws` squeezing below ~600px (pane, not calendar) · `nudge_overdue` as a stored task type
across ~90 files · `renderHero`'s dormant weekly review.

### One open item for you
**Rachel Lin's row shows a scrawl ("Send the partial · due 21 days ago") and an em-dash where the
button should be** — the deed exists but no `BoardCard` does, and a button that opened nothing
would be worse than none. Defensible as it stands (the scrawl then carries a fact genuinely absent
from the row), but if a deed should always be actionable, that is a card-derivation question rather
than a calendar one.
