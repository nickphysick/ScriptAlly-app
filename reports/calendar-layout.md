# Query Centre — Calendar layout

Ref `design-refs/query-calendar-rail-v3-locked.html` (sha256 `1b4657ca…f776d`, verified before it was
copied in), committed and enrolled. **The board inside that ref's white card is a sketch and was not
copied, matched or referred to.** Nothing in this run reaches inside the board.

---

## False premises, at the top

### 1. §6 is DROPPED — the Calendar has no ground of its own

§6 asked for the well's fill to become "the colour the Calendar view's ground currently paints".
Measured, the board and the well sit on **the same painted ancestor**: `.ws-work.ws-work--fit` at
`rgb(254, 252, 250)`. Every element between them and it is transparent — `.qcc-plain` paints
nothing.

| | fill | L | contrast vs the page |
|---|---|---|---|
| well now | `#eee8e0` | 0.8127 | **1.189** |
| well as §6 asked | `#fefcfa` | 0.9759 | **1.000** |

**ΔL 0.0000.** The recess would have been invisible but for its own inset shadow — §6's stated stop
condition. Nick's ruling: keep `#eee8e0`, change nothing in Grid or List, delete §6. Verified after
the run: the well computes `rgb(238, 232, 224)` in Grid and List at all three widths.

### 2. §5's crosshair is NOT a defect

Present and tracking. Measured over a **row's** lane: `left: 497px`, 1px wide, labelled `6 Sept`.
The first probe looked for it after hovering `.tl-c-tl`, whose FIRST match is the **rail's** lane —
which `crossAt` correctly refuses, because it is not inside a `.tl-rrow`. **The probe was wrong, not
the app.** Recorded so nobody re-opens it.

### 3. The ref contradicts itself about the rail

Its CSS carries `.rail{background:#fff;border-radius:14px;box-shadow:…}` — a white card — while its
own prose at line 141 says *"No card behind them; only the fields are white."* The prose and the
brief agree; the CSS is the stale half, left over from a card-rail variant that was locked away.
**Prose over CSS in that file.** The rail is bare and a lock asserts its computed background is
`rgba(0, 0, 0, 0)`.

---

## §5 · the today line — one real defect, and a good one

It was in the DOM on both pages and **0px wide in Query Centre**.

`--tl-nearblack` was declared on `.cal-timeline`, To-do's **page** root. Query Centre mounts the
board without that class, so all **29** rules reading the token resolved to nothing. The one a
reader notices is the today line: `border-left: 1.5px dashed var(--tl-nearblack)` is invalid at
computed-value time when the token is missing, and **an invalid border shorthand does not fall back
to a default width** — every longhand reverts to initial, `border-left-style` becomes `none`, and
the element computes to width 0.

That is a fault no DOM-presence assertion could catch: the element is there, the rule is there, the
source reads correctly, and nothing paints.

**Fixed at `:root`** — one declaration, one hex, inherited by every host that mounts the board.
Measured after: 1px dashed `rgb(28, 19, 15)` on both pages.

### Two traps on the way, both mine

**The grouped selector.** The first fix added the board's own selector to `.cal-timeline`'s rule,
creating a **second base rule** for it — so `tasksViewport`'s slicer read a two-line token stub
instead of the board's real rule and reported that the board had stopped declaring `flex: 1`. The
grouped-selector first-match trap, walked straight into, in a file whose neighbour this repo records
being caught by it twice.

**My own prose.** The comment explaining that trap named the selector the way CSS does — class, then
brace — and the same slicer reads raw source. The second red was the paragraph, not the code.

Both are now in CLAUDE.md.

---

## ⚠️ The write-once DOM reference had EXPIRED — the biggest finding here

To-do's board differed from the reference at all three widths **with no code change at all**: first
rail date `29` → `30`, month labels down 0.5–1.0 day units, every bar left by ~9px (one day on an
808px/90-day lane is 8.98px), heights unchanged.

The cause is the **date rolling from 9 to 10 September**. The board draws a rolling 90-day window
centred on today, so **its DOM is date-bound and byte-identity has a shelf life of hours.**

Proved by capturing **unmodified HEAD this morning** — it differs from yesterday's reference with
nothing changed — and measuring against that instead.

**The standing rule, now in CLAUDE.md: the reference is captured from unmodified HEAD at the start
of each run, and never carried between runs.** A carried reference makes the next session read a
date shift as damage from their own change.

---

## §1–§4 · what was built

**§1 · the rail.** 236px, bare — no fill, radius or shadow; only the three fields are white. Count,
the `WHOSE COURT` heading, the five quick filters as a vertical list with swatch, label and count,
a hairline, then Filter / Group / Sort. The active row is an **ink inset ring on parchment**, not a
fill, so a ringed row and a hovered one stay distinguishable.

It drives the same state, not a copy: `STAT_TILES` is the one table, `quickTally`/`overdueTally` the
one pair of counts, and the three fields carry **the toolbar's own trigger refs** and render **the
toolbar's own popovers**. Both axes survive the change of shape — one active court PLUS the
independent overdue flag, so `Past expected` rings alongside a court rather than replacing it.

**§2 · the header row.** Pager and range left, search centred, view switch right — starting at the
board's left edge, with the rail's column padded down by the header's 52px so the two tops align
(measured: rail y − railcol y = 52.00). The page toolbar and the stat tiles do not render in this
view.

**§3 · density as a hover pill.** Bottom-right of the board card, 14px in on both axes (measured).
Rests at `.35`, rises to 1 on board hover **or `:focus-within`** — the focus half is what keeps it
reachable without a pointer. `prefers-reduced-motion` holds it at 1.

**§4 · the card is ruler + lanes.** `TimelineWinbar` does not render here; its pager is in the
header and its density pair is the pill. The card takes the scrollport's height and the lanes scroll
inside it, so the ruler stays pinned — measured, board 665px in an 868px port with a 610px scrolling
rows region.

### ⚠️ Two deviations, both stated rather than taken quietly

**`flex: none` on the board card is load-bearing.** The element also carries `.tl-board`, whose rule
says `flex: 1` — and inside a column flex parent a grown item's main size comes from `flex-grow`,
not from `height`. Measured before the line existed: the card stood **2533px** tall against a 636px
scrollport, height declared and ignored, with the density pill 2800px down the page.

**The search's 340px is now a CEILING, and it is not always board-centred.** The ref's
`1fr auto 1fr` cannot hold below a ~950px board: `1fr` is `minmax(auto, 1fr)`, so each flank gets
`(board − 340 − 24) / 2`, and the left cluster needs **293px** for two chevrons and a nowrap
Playfair-19 range.

| viewport | board | flank each | overlap of range under search |
|---|---|---|---|
| 1280 | 692 | 162 | **119.1px** |
| 1440 | 852 | 242 | **39.1px** |
| 1920 | 1332 | 482 | clears by 200.9 |

The flanks now take what they need and the search takes what is left, up to 340. The alternative was
truncating the range — and the range is the board's primary orientation: a reader who cannot see
which ninety days they are looking at has lost more than one with a narrower search box. The
consequence is that the search is centred on the board only where the flanks agree; measured
off-centre by **+53.8px at 1280, +13.8px at 1440, −24.8px at 1920** (search 185 / 265 / 340).

**`--qcc-cal-above: 203px`** is a literal another element owns, which this repo otherwise forbids.
The honest form is `flex: 1` in a scroll row that is a flex column — the grid's `fill` mode — and
opting this page into `fill` changes all four views, outside a Calendar-only run. The number is
measured (scrollport top 111, board top 314) and **guarded by measurement**: the lock asserts the
card's bottom lands inside the scrollport and within 40px of its foot, so a masthead that changes
height fails loudly instead of silently clipping the board.

---

## §7 · proof

| | |
|---|---|
| To-do, board + winbar | **byte-identical** to today's HEAD baseline at 1280/1440/1920, HTML and geometry |
| the well | `rgb(238, 232, 224)` in Grid and List at all three widths — unchanged |
| the Calendar | rail 236px and bare, no page toolbar, no tiles, no well, header left edge = board left edge (±0.5px), pill inset 14px both axes, today line 1px, five quick filters, three fields |
| shots | `reports/calendar-layout-shots/` — calendar, grid and list at 1280 / 1440 / 1920 |

### ⚠️ Nothing inside the board moved — and the naive comparison said otherwise

The lanes capture stores each bar's box as a **fraction of the lane**, and the lane legitimately
narrows by exactly the rail's column (902 → 652 at 1280 = 236 + 14 gap). Every bar's fraction then
shifted slightly, which reads as damage.

It is not. Across **46 deltas at each of three widths**, every one is exactly **±6.0px**
(`k` min −6.050, max 6.001, mean 0.00): one fixed pixel decoration — the `fade` inset — measured
against two different lane widths. Row heights: **0 changed**. `--row-h`, `--tl-days` and every
bar's class list: unchanged.

**The same units trap as Run C's parity check**, and I walked into it again: a position that is part
fraction and part fixed pixels cannot be compared as a fraction.

### Locks

**108 passed / 44 failed**, against Run C's 39. Of the five newly red:

- **two are sign-in flakes** — `measure.ts:134`, three recorded in that run, which I ran alongside a
  screenshot pass that saturated the machine.
- **three are my own Run C cases**, retargeted here because this run retires what they asserted:
  the toolbar law now covers the three views that HAVE a toolbar and the Calendar's absence is
  asserted instead; the search selector moved to `.qcc-calsearch`; and the range moved out of
  `.tl-rng` to `.qcc-calhead-rng` — which had made both readings `""` and reported *"the window did
  not move"*, a stale selector wearing a product defect's clothes, exactly as `calWindow58` does.

After retargeting, all five cases pass: three views' toolbars identical to the pixel, the Calendar
with no toolbar and no well, filter 21 rows → 0, a bar click opening `?q=seed-cal-soon-q`, and the
pager stepping **exactly seven days**.

**One lock retargeted outside my own files**, proved red: `topCrumb`'s
`not.toContain('compact')` over `Queries.tsx` went red on the Calendar's **density** control, whose
values are `comfortable` and `compact` — a legitimate use of the same seven letters with nothing to
do with a retired `PageHeader` variant. Bounded on `variant="compact"` and `compact={`, and the
retired `full` variant added while there.

**And a capture tool was renamed out of the lock glob again.** `qcCalLanes.measure.ts` requires its
tag and **throws at module load** without one — right for a capture whose danger is overwriting the
reference, and fatal to a glob run that sweeps it in: the whole lock run died at collection. Now
`boardLanesCapture.measure.ts`, out of the glob, as `boardDomCapture` already is.

### Gates

tsc clean · production build read, no diagnostics · **466 unit files, 7,703 tests**. Two dashboard
reds in the working tree belong to another session's uncommitted `OneScreenSkeleton.tsx` /
`OneScreenTasks.tsx` / `oneScreen.css`, established by reading rather than by moving anything.

---

## Open, for Nick

1. **The search is not board-centred below ~1538px** (see the table above). The three ways out are a
   smaller range type, an abbreviated date format, or accepting the drift. The drift is what ships.
2. **`--qcc-cal-above: 203px`** wants to become a derivation when Query Centre opts into the grid's
   `fill` mode.
3. **Carried from Run C, still open:** a terminal query with no recorded close draws nothing, so a
   query visible everywhere else is absent from the calendar.
