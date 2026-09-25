# Query Centre v65.3 — overnight run log

Started 2026-09-24, unattended. Prompt: "Query Centre v65.3 — overnight, unattended".

## Phase 0 — recon

- **HEAD at start:** `6e0a64f5` "v65.2 — the stat cards' labels, lowercased as the mock renders them", on `main`, level with `origin/main` (0 ahead, 0 behind).
- **Reference:** `~/Downloads/query-centre-v85.html`, SHA256 `16d788ca…b9379` — **matches** the prompt. No hard stop.
- **Tree state:** dirty, but only in `reports/analytics/`, `reports/calendar-fixes-shots/`, `run-artifacts/` — other sessions' and earlier runs' artefacts (20 modified, 2 deleted, 2 untracked). **None under `src/` or `tests/`.**
  - ⚠️ **Premise §1.10 ("`git diff --name-only HEAD` must be empty before every gate") cannot be met** and is not mine to fix: `git checkout`/`restore` on another session's paths is forbidden by CLAUDE.md. The dirt is PNG/TXT under `reports/` and `run-artifacts/`, which no gate reads. **I read the gate cleanliness over `src/` and `tests/` only** and say so at each commit.

- **Baseline gates (22:36–22:45):** `tsc` 0 · production build clean (`built in 6.47s`, no error/warning lines) · Vitest **505 files, 8370 passed, 3 skipped** · `qcV65.measure.ts` **30 passed**. Reproduced, so no §1.7 stop.
- **v65.2 status: ALL SIX PHASES LANDED** — `8e4008a5` (1) · `dfaac53c` (2) · `66f3213b` (3) · `732955ad` (4 + 5a/5b/5c, one commit: the four phases share four files and no path split them) · `97ddf719` (6) · plus `c2e6751c` and `6e0a64f5`. **§1.2 / Phase 1 is a no-op.**

## The ref, rendered (not read)

Rendered at 1280×800, sheet opened through its own `.ropen` control. Everything below is measured:

| Thing | Measured | Prompt |
|---|---|---|
| `#csp` expanded card | 246,16 1012×768 | [246,16,1012×768] ✓ |
| `.csh` tray | 268,34 968×166 | ✓ |
| title `b` | 298,60 356×46 | [298,60] ✓ |
| `.xsub` today & next up | 678,66 278×27 | [678,66] ✓ |
| Find input | 1010,58.5 (wrapper 976,50 200×32) | [976,50] ✓ |
| `.csx` ✕ | 1188,50 32×32 | [1188,50] ✓ |
| `.xpeek` hawk | 294,116 150×143.1 | [294,116] ✓ |
| count cards | 492/620/748,128 118×54, gap 10 | [492,128] ✓ |
| `.tanchor` time controls | 876,135 340×40 | nav [898,135] zoom [1082,135] ✓ |
| `.csb` calendar body | 268,214 968×548 | [268→1236, 214→762] ✓ |
| `.xax` date row | sticky top 0, 60 tall, z 12, white | ✓ |
| `.xw0` corner | sticky left 0, **330** wide, white, z 15 | ✓ |
| corner controls | `#xfilt` 279,228 77.5×34 · `#xgroup` 361.5 73.6×34 · `#xdisp` 440 64.3×34 | left 10, centred, gap 5 ✓ |
| `.mb b` month label | sticky **left 338** (= 330 + 8), Special Elite 13px ink, y 223 (top + 8) | ✓ |
| `.dl` Monday dates | y 245 (top + 30) | ✓ |
| `.hstrip` heat | y 269, 6 tall (row foot) | ✓ |
| `.tdy` TODAY | 935.2,247 43.6×14 (top + 32) | ✓ |
| `.xg` group band | sticky **top 60**, 30 tall, `rgb(42,58,82)`, z 9; label `b` white 14px, count `i` `rgba(255,255,255,.62)` 9px | ✓ |
| `.xr` row / `.xr.late .xw` | 44 tall / names cell **white** | ✓ |
| rail `#railcal` | 918,92 340×692 | ✓ |
| rail row `.tr.late` | 930,322 316×40 (12px clear each side of a 918→1258 card) | ✓ |
| rail bar `.pg` | 1100,338.5 **84×8**; track `.pb` 1104→1174 (**left +4, right −10**); allowance `.al` 56.5; overrun `u` 13.4; notch `s` 2×14 | ✓ |

No disagreement found between the prompt's figures and the render. **The prompt's numbers are the mock's.**

## Plan

Phases as §9. Files: `QcBirdsEye.tsx`/`qcvBirdsEye.css` (§3) · `QcExpanded.tsx`/`qcvExpanded.css` (§4, §7) · `QcTimeline.tsx`/`qcvTimeline.css` (§5, §6, §7) · `QcCalControls.tsx` (§6) · `lib/qcBirdsEye.ts` (progress, next-up) · `lib/qcCalView.ts` (Group, Next action) · `lib/qcTimeline.ts` (bands, Mondays, heat) · `tests/e2e/qcV65.measure.ts` (repoint + new cases).

**Risk named up front:** phase 2 repoints the comparison to v85 while the app is still v65.2, so the ref-comparison cases go red *by the order the prompt sets*. I retire or re-target only the ones v85 supersedes, name each in the log, and let the build phases restore the rest.


## Phase 2 + 3 — landed, `34651583`, pushed (23:15)

**Phase 2.** v85 enrolled and guarded; `qcV65.measure.ts` repointed. **No retirement was needed** —
30/30 green against v85 before any §3 work, because v85 leaves every element the comparison reads
where v74 had it. The risk named in the plan did not materialise.

**Phase 3.** `eyeProgress` replaces `eyeBar`; the axis, the due line, `TRACK_DAYS` and
`UNDATED_LEAD_DAYS` are retired. Headings sticky and full-width; overdue rows inset; toggle labels
centred; legend reads "to the date" as the mock does.

**Three things the page found that no unit test could:**
1. A row read **"60d over" beside an EMPTY dashed track** — `stageStartMs` null with an expected
   date set. The window's start now falls back to `sentMs`, which is the date the expected date was
   computed from. Not an invention; logged as a decision below.
2. `width: 100%` + a margin made the overdue row **24px wider than the card** (12 clear left, 12
   PAST right); `width: auto` made it **shrink-to-fit at 232 against 340**, with the bar's column
   computing to `0px`. `calc(100% - 24px)`.
3. The heading's 18px of air was a **margin**, which sits outside the background — a stuck heading
   would have shown 18px of rows above it. The mock puts it in the padding; measured and copied.

**A probe fault, not a page fault:** a query two days into a ten-week window has an allowance of
0.996 and an overrun a third of a pixel wide. Rounded to one decimal that read as "no overrun",
i.e. the probe reporting a correct page as broken. Presence and magnitude are now separate readings.

- Gates: tsc 0 · build clean · **8,369 passed / 3 skipped** (baseline 8,370 — one case retired with
  the due line it asserted; no case lost coverage).
- Measurement: **30 passed**, including the rewritten §3.2/§3.3 and §6 cases.
- Mutations proved red (4): the deepened fill · the heading's sticky dropped · the overdue inset
  dropped · the notch flattened into the track.
- Shots: `shots/rail-app-1280.png`, `rail-app-1920.png`, `rail-ref-1280.png`.

### Decisions taken overnight (§1.5)
1. **The window's start falls back to the send date** where the stage entry is unrecorded. Reason:
   the expected date is `last send + the agency's window`, so the send is the end's own origin;
   evidence: a row rendering "60d over" against an empty track. Alternative (leave it undated) was
   refused because it makes the row contradict its own date column.
2. **A window of zero or less is fully overrun**, allowance clamped to a 3% floor, rather than a
   division by zero. Changes least; the notch still has somewhere to stand.
3. **The legend reads "to the date"** (the mock's words), not "of the window" — the mock settles it.

## Phase 4 — landed, `b2192eb3`, pushed (00:10)

The card is framed on the viewport (16/16) and sits over the shell's bar; the body is a panel; the
tray is layout A with today & next up, Find, compact count cards and the time controls.

**Four page faults the measurement found, all mine, all invisible to the unit gates:**
1. **A portal carries its own rules — and it made the whole CARD scroll.** `.qcv-tl-controls` is
   absolutely placed for the lane, so inside the tray it put itself 318px from the tray's left and
   overflowed the card to 1631 against 1396. `overflow: hidden` hides overflow and still SCROLLS:
   the card's `scrollWidth` became 1363 against a 1128 client, and the first click on a zoom button
   focused it, so the browser scrolled the CARD 235px and moved everything in it left. The tell was
   a body measured at 55 inside a card at 268 — impossible for a static child, and exactly what a
   scrolled ancestor looks like.
2. **The crosshair's clamp compared the tag's CENTRE.** The rule centres the tag, so a centre one
   pixel clear of the bound still put half of it under the names column — measured at 561.5 against
   a bound of 591. The trigger reads the tag's own measured width now.
3. **The title lost its `!important` and rendered in Playfair.** It is an `<h2>`, and `brand.tsx`
   forces headings to the serif at runtime with `!important`. CLAUDE.md records this; I reintroduced
   it anyway by rewriting the rule, and only the render caught it.
4. **One probe was unscoped.** `document.querySelector("[data-qcv='tl-names']")` read 356 where the
   card's own column is 591 — the standing every-page-stays-mounted hazard.

**Assertions retired rather than loosened, each with its reason in the file:** the card's top/bottom
equalling the rail's (§4.1 moves it over the bar — and the replacement asserts the precondition that
the window is *below* the viewport's top, or the case proves nothing); the title's midpoint equalling
the tray's (layout A states a corner); the head 34px after the title (the head has a corner now and
the measured-text law moved to "today & next up"); "on the same line as the nav" (the nav is in the
tray). `CARDS_PAD` and its four terms are retired with the layout they described.

- Gates: tsc 0 · build clean · **8,371 passed / 3 skipped**.
- Measurement: **30 passed**.


## Phase 5 — landed, pushed

**§5 · the date row.** One sticky 60px row of two cells, inside the scroller, replacing the 52px
lane and the 52px tier:

- **the corner** — sticky-left, the names column's own width, white and opaque, holding §6's Filter
  and Sort (and, from §6, Group and ↺). The cluster is CENTRED in it; it used to be an overlay at
  `top: 8px; left: 44px` measured against the lane from outside.
- **the tier** — transparent, because what colours it is the month bands inside it.
- **month bands**, one per month, contiguous and alternating (`#faf7f3` / `#f2ede5`), each naming
  itself in typewriter 13px with its year in mono 8px beside it, the LABEL sticky at the names
  column's right + 8 so the month a reader is looking at is the one named.
- **every Monday's date**, mono 9px, centred on its x, with a 1 × 4px tick that is the label's own
  `::before` — one element, so the tick and its date cannot drift apart.
- **the heat**, a 6px navy strip along the row's foot with 1px gaps, replacing the 24px bars.
- **TODAY**, the ink pill, on the dates' line at `top: 32px`.

**What it retired, and why it is the point of the phase.** The month LABELS were points that had to
dodge the TODAY pill, and the clearance was a share of the TRACK — which on a three-year pipeline is
376px of hole either side of today: thirty-five labels rendered and not one of them visible. A band
has somewhere else to put its name, so there is nothing left to dodge. `monthTicks` and `.qcv-tl-mon`
are deleted rather than left inert.

**The lane survives with `height: 0`.** It still holds what must NOT scroll with the dates — the edge
markers and the crosshair's tag — and it is still a sibling of the scroller, which is what makes
those the same elements before and after a zoom (§11 lock 6). `height: 0`, not `display: contents`:
its children are positioned against it, so it has to remain a containing block.

### The ref decided four values I had reasoned wrongly about

I read the ref's cascade before rendering it, and was wrong about the one that mattered. The rules
say `body[data-dt="2"] .xheat { display:none }` and `u.tdy { background:#fff; color:var(--ink) }`,
which reads as *no heat strip, and TODAY as plain ink text on white*. **Rendered, the ref draws a
6px `.hstrip` (a different element) and TODAY as an ink pill with cream text at `top: 32px`.** The
two are the same law this file already carries about first-match slicing, one level up: a value read
off a stylesheet is only the value if you have checked which declaration wins AND which element is
the subject. Measured off the render instead: corner `padding: 0 10px`, the cluster 10px in and
centred; band label `margin: 7px 0 0 8px`, sticky at names + 8; Monday labels `top: 30px` with
`padding-top: 6px` and the tick at the label's own top; TODAY `padding: 2px 7px`, weight 600.

### Faults found by the measurement

1. **The date row measured 61 against the ref's 60** — the hairline was outside the stated height.
   It declares its own `box-sizing: border-box` now, per the standing rule that a rule whose maths
   depends on the box model states which model it is in.
2. **Three assertions were about a box that had gone.** "The cluster sits 8px into the lane", "…44px
   into the lane" and "the date row is on white" all read `[data-qcv='tl-lane']`, which now has no
   height and no fill. Retargeted rather than loosened, and the replacements are EQUALITIES rather
   than offsets: the cluster's centre IS the row's centre, and the corner's box IS the names cell's
   box. Both survive §6 resizing the buttons — an offset would not, which is exactly the kind of
   legitimate edit a pinned number turns into a false red.

### Locks, each proved red

Seven mutations in the measurement worktree, one named thing at a time, each reddening the case that
claims to guard it: the row not sticky · the tier filled white · the band label not sticky · the
Monday tick moved off the label's top · the TODAY pill off the dates' line · `.qcv-tl-mon` restored ·
the corner drawn outside the row.

- Gates: tsc 0 · build clean · **8,374 passed / 3 skipped** (baseline 8,370).
- Measurement: **30 passed**, 1,248 assertions. Date row 60 · corner left = names left (0) · cluster
  centred (0) · cluster 10px inside the corner · the row's own white.


## Phase 6 — landed, pushed

**§6 · the corner's controls, and Group.** Three buttons and a ↺ in the date row's corner — the ref's
own compact set (34px tall, 9px padding, 12.5px type, borderless `#f7f3ee`, ↺ a 30px disc) — and the
names column widened 300 → 330 to hold them. The popover opens from the cluster's LEFT edge rather
than centred on it, because a centred panel at the corner's left hangs half of itself over the dates.

**Group is its own control.** It rode inside Sort's popover, which lit the Sort button for a setting
Sort does not own and buried the page's most useful arrangement two clicks down. `sortDiffers` splits
into `groupDiffers` + `sortDiffers`; `anyDiffers` is their union; the panel is still ONE element with
three sets of contents, so "only one can be open" stays structural.

**Five groupings: Urgency · Status · Next action · Submission package · No grouping.** Two were
renamed to the mock's own words — "Attention" is a word a reader never sees on the cards, and
"Nothing" reads as an option that does something.

**Next action, the seventh group, and the one decision in the phase.** The mock classifies by status
for three with-you cases (offer, full requested, partial requested) and lets everything else fall
through to a date branch — nudge, consider closing, waiting on the agent. Its fixture has **no
Revise & Resubmit**, so a live R&R would fall through and be filed under *"Waiting on the agent"*:
a confident wrong statement about a query where the writer owes a new version. `isWithYou` is ONE
definition in this app (partial requested · full requested · R&R) and it governs here too, so
**`revision` — "Revision owed · send the new version"** is the seventh group, drawn only when there
is one. That is the same shape `stageOrder` already uses for the summary's seventh column, and it is
an extension rather than an invention: the alternative is a fabricated value rendered with the same
confidence as a real one, which this repo's own law forbids.

Thresholds are the mock's: past the expected date by more than **28** days, or undated and more than
**84** days in the stage, is *Consider closing*; past it by less is *Nudge due*.

### Faults found

1. **A fixture that tested the wrong field.** The close-threshold case set `responseDeadline` and a
   send date far apart; `resolveExpectedDate` reads the last send plus the agency's window, so a case
   asking for 27 days over got 244. It is driven by the send date now, with the reason at the value.
2. **Three unit locks and five measurement assertions were about the old arrangement** — 40px white
   outlined buttons, a centred popover, a 300px names column, a "Nothing" radio inside Sort's panel,
   and a grouping sequence that clicked through Sort. Each retargeted with its law stated.
3. **The month-visibility probe counted BANDS BY CONTAINMENT.** The month markers were points, so
   "wholly inside the box" was the same question as "on screen"; they are bands a month wide now, and
   at the 6w zoom the window is shorter than a month — so no band is ever wholly inside it and the
   probe reported **0 of 37** about a row naming its month perfectly well. It counts the sticky
   LABELS by intersection now, which is what the claim was always about. Measured after: 3 · 2 · 3 · 6
   labels visible at open, 6w, 3m and 6m.

### Locks, each proved red

Ten mutations: Group losing its own "differs"; Group losing its button; Sort's reset reaching the
grouping again; an R&R falling through to the date branch; the close threshold dropping to a week; a
hint invented for the status groups; the buttons back to 40px outlined; the popover centring itself;
the names column back to 300; the band dropping its hint.

- Gates: tsc 0 · build clean · **8,385 passed / 3 skipped**.
- Measurement: **30 passed**, 1,256 assertions. Filter/Group/Sort 34px at x 301 · 385.5 · 464, on one
  line, inside a 330px corner whose box IS the names cell's.
