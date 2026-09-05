# Calendar v64 — run report (§A–§F + the sweep)

Ref: `design-refs/timeline-v64.html` (sha256 `f5f032f22177…`, title "Calendar v64 · design of
record"), enrolled in `.refhashes.json`. Commits: `df87ea5a` (ref) → `84249692` (§A–§E) →
`5760dc6c` (§F) → `906dc7d9` (sweep). Deployed to dev at `906dc7d9`, served hash
`index-ByjtnH0a.js` verified against the build. Screenshots: `reports/cal-v64/`
(comfortable · compact · peek · deployed).

## What §F built (measured, 1440×900 against the local build; deployed hash verified)

- **Compact** — 52px row / 40px bar; the band element survives as an invisible full-height rail
  for its dot (14px) and holder (6.5px); a 4px status edge painted as the frame's
  `background-image` from `--st`, lifted off the band's own `tl-st-*` class by `:has()`; name
  13.5 · agency 11; no fact at rest; ghosts one line; actions ×.9. Eight ladder rungs exercised
  in one census (`calDens64`).
- **The peek** — a page-layer CLONE of the hovered bar in a `tl-board` wrapper *without*
  `data-dens="compact"`, so it renders as the comfortable card by construction (a second
  rendering is two cards waiting to disagree). 60ms intent, 140ms fade, 86px, min 260px, z46;
  clears on leave or scroll; a scroll clear suppresses re-intent until the pointer physically
  moves (scrolling slides new bars under a stationary cursor and the browser fires `mouseover`
  on whatever lands there). The clone is paper: no listeners; `clone.style.animation = "none"`
  because `tlStir`'s keyframes baked `translateY(-50%)`. The card tooltip yields to the peek in
  compact (the same sentence was narrated twice).
- **Soft window edges** — a card cut by the WINDOW keeps corners + hairline and stops 6px short
  of the lane, lane-anchored (`left: 6px`, `100cqw` arithmetic — two fixture cards start 1.2px
  left of the lane and `var(--l) + 6px` gave 4.8px gaps). `cutR` (geometry: the drawn box at
  the lane's edge — journeyBars clamps `liveStop` at `span`) split from `clipR` (knowledge: an
  expectation named beyond the window, carried by overdue waits whose bars stop at today);
  conflating them shortened a today-terminating bar by 6px. The ONGOING edge stays square ON
  the today line.

## Found by the locks (each a fault that shipped green)

1. **The ongoing frame ended 16px short of the today line, for two packs.** `.tl-p.fadeR
   .tl-frame { right: 16px }` was the v61 chevron notch's reservation; the chevron died in v63
   §D. The line-meeting lock measured `.tl-p`'s box, not the frame's ink, and no difference
   list sampled an ongoing card — v64's samples one by name, which is how it surfaced.
2. **`--tl-lane` was read four times and defined nowhere** — the board's ground was silently
   transparent from the day §A landed; the page cream showing through read as close enough at
   a glance. The `var()`-on-undefined class, found by the rail-tone lock.
3. **The rail sat 20px off its own columns** — `padding-left: var(--tl-nm-w)` (the retired name
   column's 0) came after the new `padding: 0 20px` shorthand and quietly won the left side.
   The rail cell is its own `inline-size` container, so the date PITCH was subtly wrong too.
4. **The range headline rendered Inter** — the board's `:where()` font sweep is 0-1-0 (`:where`
   adds nothing) and declared later than `.tl-rng`'s 0-1-0 rule, so `inherit` beat Playfair.
   Any bare-class font rule ABOVE the sweep loses to it; `.tl-winbar .tl-rng` outranks it.
5. **The stir and the owed scale retired** (`data-anim="none"`; the ref's owed card measures a
   plain translateY). scale(1.006) moved painted edges 1.2px each way — the 4.8px lane gaps and
   the today-line overhang were the same treatment arguing with two geometry locks.
6. **Owed's z-standing retired in the sweep** — the ref's owed computes z2; at dev's z4 an
   owed card painted OVER the today line (z3) it was standing on.
7. **The compact stripe died on quiet cards** — `.tl-p.quiet .tl-frame { background: … }`, the
   `background`-shorthand-resets-the-image class; every frame variant now declares
   `background-color`.
8. **A dead-since-written Upcoming gate** (§A–E): `nextDatedIn <= 14` compared days to
   epoch-ms; converted at both call sites.

## The difference gates

`elemDiff` (element profiles, ref vs dev, three cards sampled by kind — uncut · left-cut ·
ongoing): **0 entries**. Named deviations, each with its reason printed every run: the
container's app-shell width/height family; the winbar's radius (the container clips; the ref
rounds the bar); the frame radius 9 vs the ref's own 10-vs-9 internal inconsistency; the pulse
dot on the app's near-black; fixture text/position; the ref's GROUPS|FLAT segment above the
panel (duplicates Group→None — one home per control, deliberately unbuilt); `card (left-cut)`
absent in the ref's fixture. `diffList` (readings): clean.

**Panel form deviation, named:** the ref FILLS a selected checkbox with ink; dev keeps a
tick-in-a-white-box (a wall of solid boxes on an all-ticked six-section filter reads as pressed
buttons) at the ref's 12px/1.3 geometry, in the app's rose.

## The sweep (eighteen suites; 83/83 measurement cases green in one run)

Retired as inverses with successors named: calOne61, calFidelity60, calCard54, calInset55,
calOrder56 (it HUNG on the retired Soonest toggle), calOrder58, calClosed56, calCard,
calOpen54, calGhost56 (its v58 cap was itself a corpse). Retargeted to the living anatomy:
calContrast, calCopy55, calFaults56, calCentre, calAccept55, calFrame56, calGhost,
calGround54 — plus calTool63 rewritten as the panel-drives-the-board file (four groupings
drawing four distinct sets, the facet census summing to the board, untick→hide→Clear driven
end to end), calFrame63's §B/§E cases, calTask63/calBehav63's selectors, and calFid63 items
1–4 to the v64 chrome.

**Lock-drift findings that looked like product faults and were not:** the "wash left of today"
was the tinted bands meeting a v54 probe; the "closed cards drawn live" seeds are quiet, not
terminal; the "cards ending 4px short of today" was the arithmetic lane-centre — the true line
sits half a day left ((days−1)/2), plus its own −1px stroke-centring shift, both terms now
named in the tolerance.

## Reported for Nick (not resolved)

- **The muted type register sits below WCAG AA**: the italic agency ≈4.13:1, the mono tail
  ≈2.81:1 (≈2.43 on a quiet card's tinted frame), the 7px band holder ≈4.05:1 — the ref's own
  inks, deliberate quieting. `calContrast` now holds primaries (name, fact, band status) to
  4.5:1 and censuses the muted set with a 2.3 floor, so it cannot sink or grow silently. An
  accessibility call about the design language, when you want it.
- **The tight-card widen runs on zero subjects**: every harness card fits its span, so
  `data-tight` never appears and the v54 widen (plus its `data-nodetail` CSS, which now selects
  the retired `.tl-cdt`) is live code nothing exercises. `calOpen54` reports the count every
  run. Worth a decision: retire the widen (the glide clips overflow) or seed a long-named
  fixture.

## Debts

- The tint-ladder `:root` consolidation stays the QC session's (recorded at the tokens).
- `calendarToolbar.ts` still exports the dead GROUP_BY_*/ACTION_* set (last reader pruned);
  flagged for a cleanup commit.
- `datePickerHub`'s red is the header session's (date-pinned).
