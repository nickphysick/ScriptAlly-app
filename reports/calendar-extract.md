# Calendar — extract the timeline board, host it in Query Centre

**Run A (Steps 0–2).** Step 0 cleared on the second pass. **Step 1 — the inventory — is below.**
No code has been changed.

---

## False premises, at the top

### 1. `timeline-v57.html` — settled

Named in the brief as the board's normative ref; it is not, and Nick has withdrawn it. The board
cites **v65** (drawer), **v63** (`dk-*` bar families), **v58** (`.nlab`/`.tmark` — *"Every value
here is from `design-refs/timeline-v58.html`. Nothing in this block was chosen."*) and v35
(Porcelain, historical). `grep -rn "timeline-v57" src/` returns nothing. **Board ref is v65,
already enrolled.** Nothing to copy.

### 2. The placement ref — withdrawn

`query-board-calendar-v2-nowell.html` is not used in this run. Two placement facts replace it, and
they are Run B's business:
1. Board and Calendar render on the page parchment, no recessed well; the well is Grid and List only.
2. The toolbar, search and view switch keep identical rects across all four views at 1440 (±0.5px).

### 3. ⚠️ THERE IS NO 2/4/6-MONTH WINDOW ZOOM — the control the brief asks to inventory and mount does not exist

Step 1 asks for *"the 2/4/6-month window zoom and which is default"*; Step 4 places *"the window
control (2/4/6 months) … in the board's own bar as it does on To-do"*. It is not on To-do.

`src/lib/timelineRanges.ts:63` — the whole table:

```ts
export const TIMELINE_RANGES: readonly TimelineRange[] = [
  { label: "3 months", days: 90,  grain: "week",  dense: 3 },
];
```

**One stop.** v58 deleted the picker outright — *"⚠️ v58: ONE WINDOW, NINETY DAYS, AND THE PICKER
IS GONE. The ref fixes `N = 90` with today at 50% and moves the board by whole weeks instead."*
The 1-week and 2-week stops went earlier (Porcelain Phase 2). What replaced the zoom is a **pager
that moves by whole weeks** — `WEEK_STEP = 7` (`TodoCalendarPage.tsx:232`), the `‹ WEEK / WEEK ›`
control.

The harness already knows: `tests/e2e/calControls.ts:77` — `setRangeTo` **throws**, with the
message *"v58 has N window(s) — the range control is gone."*

**Consequence for Run B.** Building a 2/4/6 control in Query Centre would invent a feature the
To-do board does not have — which the standing correction makes a regression, not a decision. The
board has one window; Run B mounts one window and the week pager.

---

## Step 0 — the gate (history)

| Clause | Result |
|---|---|
| 1 · file ownership | **PASS** — `src/components/todo/` and all 53 `cal*.measure.ts` clean; nothing written in 90 min; last commits `078fca09` (§E, 3d) and `d43d532c` (§F, 4d) |
| 2 · v65 §E landed | **PASS** — §A `e0f540e4` → §F `d43d532c` → §E `078fca09`, whole sequence on `main` |
| 3 · refs | **CLEARED by Nick** — v65 stands, placement ref withdrawn |

---

## Step 1 — the inventory

Numbered for the Step 5 walk-through. `TCP` = `src/components/todo/TodoCalendarPage.tsx`,
`CSS` = `src/components/todo/todoCalendar.css`.

### A · Geometry and scale

| # | Behaviour | Where |
|---|---|---|
| A1 | **One fixed window: 90 days**, grain `week`, density tier 3. No zoom control. | `timelineRanges.ts:63` |
| A2 | **Today is the centre of the lane.** `pastDaysOf = (days - 1) / 2` → 49.44%; the half-day residue is stated as a tolerance, not corrected, because the board places a day at its MIDPOINT (`EVENT_AT = 0.5`) while the ref places it at its boundary. | `timelineRanges.ts:88`, `journeyBars.ts:55`, tolerance in `calCentre.measure.ts` |
| A3 | **The window pages by a whole week**, both directions, arrow keys too. Not by whole windows. | `WEEK_STEP` `TCP:232`, pager `TCP:1062` |
| A4 | **Position is a fraction of the window in `cqw`, never a percentage and never a pixel.** `pct(n) = calc(n / var(--tl-days) * 100cqw)`. `--tl-days` is declared once on `.tl` (`TCP:3090`) and inherited. `.tl-c-tl` is a size container, so `100cqw` is the lane's width *at any depth* — the fix for the bar's fill (a grandchild) silently measuring the bar instead of the lane, i.e. two date→x mappings while every rule read correctly. | `TCP:234`, CSS container at `.tl-c-tl` |
| A5 | **A lane index is DATA; where the lane sits is geometry.** The page emits `--lane`/`--lanes` only (`laneVar`); every vertical offset is a `calc()` over `--lane-h` in the sheet. `LANE_STEP = 52` and `laneTop()` are retired — they were two expressions both reading 52, which put a 36px bar at `top: 0` in a 132px row. | `TCP:267`, CSS `:1046` |
| A6 | **Row height is density, bar height is not.** `--row-h: 106px` comfortable, `--row-h: 52px; --bar-h: 40px` compact. A lock proves changing `--row-h` cannot resize a bar. | CSS `:642`, `:1892` |
| A7 | **Two densities only** — `Comfortable` and `Compact`. `Regular` and the old 124/104 are deleted as words and values. | `DENSITY_LABEL` `TCP:119` |
| A8 | **A row's min-height is `--row-h × --lanes`** — lanes are data, row height is geometry. | CSS `:1046` |
| A9 | **Stage gates are day counts, never lane fractions**: `STAGE_MIN_DAYS = 4` (below this a stage is skipped), `STAGE_NARROW_DAYS = 8` (below this the badge drops). The ref states them as 3.5%/8% of the lane; at a fixed 90-day window they are the same numbers, rounded up to whole days. | `TCP:147–148` |
| A10 | **The rail is 55px** (`--tl-rail-h`) and is **not sticky** — v60 forbids a sticky rail inside the zone (v58 had it that way). | CSS `:712`, `:276` |
| A11 | **The month shelf tier is unconditional.** It was gated at ≥3 months; the gate is gone. | JSX note `TCP:3117` |
| A12 | **One thing on this board scrolls** — the rows region (v60, Law 4). | `TCP:3165` |
| A13 | **`isolation: isolate` on the row** makes children's z-indexes the row's own business, so no row and no card can escape it; the today line and the probe are drawn outside for exactly that reason. No `overflow: hidden` on the lane — a clipping ancestor beats every z-index. | CSS `:908`, `:935`, `:376` |

### B · Marks and bars

| # | Behaviour | Where |
|---|---|---|
| B1 | **A card spans exactly its own dates — no clearance at either end.** The 2px inset painted the terminal mark *outside* the card (measured: mark centre 889.4 against a card ending 887.4). `abutL`/`abutR` retired with it. | `TCP:236–253` |
| B2 | **Two marker kinds, and the shape is the claim.** `status` — the status changed here, drawn as the locked `StatusDot`. `direction` — an activity was recorded and the status HELD, drawn as a smaller ringless dot. Derived from **whether the activity wrote a `resultingStatus`** — a nudge, a holding reply and a logged note all write none. | `journeyBars.ts:155`, `:359` |
| B3 | **Four circled marker faces**: `in` (arriving), `outk` (leaving), `bang` (a nudge or reminder fallen due), `clock` (gone quiet). 20px circles on white with a halo of the row's own colour. No notch. | `journeyBars.ts:157`, `:378` |
| B4 | **`Waypoint`/`WaypointKind`/`OVERRUN_SPAN` are retired.** A forecast is stated by the FILL instead: a filling bar means a date exists, an empty one means nobody set it, and the bar ends on the date either way. Captions moved to the bar's tooltip, which survives ranges where labels drop out. | `journeyBars.ts:~390` |
| B5 | **The fill is an element with a width, not a gradient stop** — a background percentage is unreadable to a probe. `fillFor` is the only thing that decides N. | `TCP:285` |
| B6 | **A bar with no named end renders NO fill element at all — not a fill of zero.** Zero claims no time has passed; absence claims nobody named a date. | `TCP:285` |
| B7 | **Open edges**: `openLeft` (began before the window) draws a dotted left edge, squared off; `openRight` (continues past it) a dashed right edge, squared off. An ongoing bar ends in a **chevron, not a dissolve**. | `Segment` `journeyBars.ts:161`, CSS `:1804` |
| B8 | **The window's edges are soft** (v64 §F), superseding v63 §D's hard cut. | CSS `:1847` |
| B9 | **Provenance — three sources, not two.** `namedEndFor` returns `NamedEnds { end, window }`; `NamedEndSource = "window" \| "sendBy" \| "reminder"`. `end` is the date the bar RUNS TO; `window` is the date the AGENCY stated, whether or not it won. They are returned together so no consumer re-derives the second. | `journeyBars.ts:448–482` |
| B10 | **One `namedEndFor` replaced three derivations** that disagreed: the bar used `Math.max(...sends)`, the row's copy used `Math.min(...sends)` — the opposite send into the same resolver — and a third read the earliest send again. That is where the impossible day-counts came from. | `journeyBars.ts:~470` |
| B11 | **`hatchPct` is retired except on `quiet`**, where there is no named span for a fraction to be *of*. The hollow continuation says the same thing for every family. | `journeyBars.ts:~395` |
| B12 | **Bar text**: `barLines(label)` splits to two lines `{t1, t2}`; names render **as stored** — no transform, no upper-casing (locked). | `journeyBars.ts:131`, lock `calBar63 (d15)` |
| B13 | **The today line passes UNDER the rail and its cap sits ON it** — two z-indexes either side. Dashed `#b8a889`, `z-index: 39`. | CSS `:1630`, `:1643` |
| B14 | **Past stages** draw at `STAGE_BADGE_PX = 16` with the sheet draining the medallion to 0.22 rather than shrinking it away — size here, opacity there. | `TCP:138`, CSS `:2173` |

### C · State

| # | Behaviour | Where |
|---|---|---|
| C1 | **Ten bar states**: `closed \| theirs \| theirsq \| nudged \| quiet \| ghost \| y1 \| y2 \| y3 \| offer`. | `journeyBars.ts:574` |
| C2 | **Holder comes from `side` alone** — `holderOf(sg) = sg.side === "yours" ? "writer" : "agent"`. The family previously also consulted three query-level facts about TODAY and applied them to every piece, so one journey alternated families (`req \| req \| quiet \| req` measured on one row) because a stretch that ended weeks ago was coloured by an expectation that passed after it. | `journeyBars.ts:590` |
| C3 | **`familyOf(state)` is holder + kind, never age.** `quiet`, `nudged` and `theirsq` are properties of the LIVE stretch only: each characterises an absence, and a stretch that ended cannot be characterised by the absence of an ending. | `journeyBars.ts:600` |
| C4 | **Two silences, split by v60 (v58 had folded them).** `quiet` = a stated reply date that has passed on a running wait — **prompts**. `ghost` = the same absence past `GHOST_AFTER_DAYS = 180` — **does not**. Before the split, seven Urgent rows wore the sand `No Response` chip and offered no move at all. `barState` decides; nothing re-derives a threshold. | `TCP:~295`, `journeyBars.ts:650`, `:652` |
| C5 | **Weight tiers**: `fresh` ≤ 7 days, `settled` ≤ 21, else `long`. | `journeyBars.ts:63–64`, `:684` |
| C6 | **`overdueSpan(days)`** is the one overdue phrasing; `latenessLine` and `barFactLine` build the band's sentences. | `journeyBars.ts:1605`, `:1638`, `:1696` |
| C7 | **The band states `Nudged {date}`, never a count.** A nudge count lives in the query's activity subcollection and this page deliberately does not load per-query events — composing a count from what it holds would be inventing it. | `journeyBars.ts:161` note |
| C8 | **The pill is the app's own vocabulary** — status while the agency holds the move, the deed while the writer does, nothing else reachable. `DEEDS`, `capWord`, `PILL_WORDS`. | `calendarPill.ts:46`, `:89`, `:119` |

### D · Rows, sections, tabs, sorting

| # | Behaviour | Where |
|---|---|---|
| D1 | **Five tabs**: `all`, `needs`, `agents`, `tasks`, `closed`. `NEEDS ME` is `needs`. `rowInTab`/`tabOf` decide membership. | `timelineViews.ts:21` |
| D2 | **Four group modes**: `list`, `move`, `status`, `manuscript` (`groupKeyOf`). | `timelineViews.ts:71` |
| D3 | **Four sort keys**: `urgency`, `status`, `sent`, `recent`, with `STATUS_LADDER`/`statusRank`. One comparator per key. | `calendarToolbar.ts:65`, `:81`, `TCP:1988` |
| D4 | **Six drawn sections** with a cascade, per-section purpose, label and view (`CAL_SECTION_CASCADE` / `_DRAW` / `_PURPOSE` / `_LABEL` / `_VIEW`); `UPCOMING_WINDOW_DAYS = 14`. | `calendarSections.ts:44–104` |
| D5 | **Facets** (v64 §E) drive filtering: `rowFacets`, `rowPasses`, `rowCarries`, `emptyOff`, `hiddenCount`, `FACET_SECTIONS`; move grouping `MOVE_GROUP_ORDER = you \| them \| offer \| shut`. The v63 toolbar is deleted and the sidebar reads this model. | `calendarFacets.ts` |
| D6 | **A group is a divider, not a container** (v61). | CSS `:789` |
| D7 | **Nothing divides the rows** — no border, no stripe, no hover ground (locked). | lock `calBar63 (d14)` |
| D8 | **Tasks are bars too** (v63 §F) — `taskBar`, `taskHolder`, `taskTail`. | `TCP:1139`, `taskBars.ts` |

### E · Interaction

| # | Behaviour | Where |
|---|---|---|
| E1 | **Bar click** → `onPick(el)`; keyboard `Enter`/`Space` picks with `preventDefault`. | `TCP:457`, `:460` |
| E2 | **Marker click** → its own `onPick`. | `TCP:771–777` |
| E3 | **A nested open control stops propagation** so it does not also pick the bar. | `TCP:597` |
| E4 | **Hover is lift and reveal, nothing else** (v65 §B) — `.tl-p:hover` translates `(2px, -2px)` at `z-index: 5`. Row-level `onRowsOver`/`onRowsOut`. | CSS `:1312`, `:1324`, `TCP:1230`, `:1241` |
| E5 | **The one door** (v65 §E ruling) — a single opening route. | `TCP:1251` |
| E6 | **Card C** (v65 §C) — the click card, a page-layer READ overlay, drawn per card kind (`cardCFor`, `CardKind`). | `TCP:1276`, `:3293`, CSS `:1945` |
| E7 | **The drawer** (v65 §D) — `drawer` state, two tabs `view`/`actions`, `openDrawerFor(rowKey)`, `closeDrawer`. Ref `timeline-v65.html`'s `.drawer`, its own px. | `TCP:1375–1397`, `:3366`, CSS `:2022` |
| E8 | **Drag a task to a new day.** | `TCP:1209` |
| E9 | **Crosshair, one tooltip, and `RIGHT NOW`.** | `TCP:1634`, CSS `:1578` |
| E10 | **Actions on the board** (v63 §E) — `ActionMark`/`ActionSym`, `actionKindFor`, prefills. | `TCP:804`, `:853`, CSS `:2247` |
| E11 | **No dissolve, no shadow** — both retired (v60 Law 2, closed by §D). | `TCP:677` |

### F · Data in

Read from `useScriptAllyDb()` at `TCP:887`:

```
tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser, updateUserTask
```

| # | Behaviour | Where |
|---|---|---|
| F1 | `activities` is already loaded unwindowed; the board derives and **reads nothing new**. | `todoCalendar.ts:224` |
| F2 | **The exchange count sequences over the whole query, not the visible days.** | `todoCalendar.ts:410` |
| F3 | **No reply-stated window at this level**, matching every other list surface — the page's data does not carry `replyWeeks`, so composing a window from it would be inventing one. | `todoCalendar.ts:737–741` |
| F4 | `calendarDays`, `recordDays`, `dedupeAgainstRecord`, `ghostsFor`, `shortCalDate`, `carriedLine`, `expectedLine`, `REC_TONE`. | `todoCalendar.ts` |
| F5 | `assembleBoardColumns` / `BoardCard` — the To-do card unit (also the app-wide counting law). | `TCP:73–74` |
| F6 | Writes go through `updateUserTask` with `classifyWriteError` / `saveErrorCopy`. | `TCP:91` |

---

## Findings — things the inventory turned up that are not behaviour

### ⚠️ F-1 · Seven geometry constants are DEAD, each carrying an elaborate ⚠️ law

Verified by word-boundary sweep across `src/` and `tests/` — each appears exactly once, its own
declaration, with no reader anywhere:

| Constant | Value | The law its comment states |
|---|---|---|
| `TEXT_INSET` (`TCP:195`) | 14 | *"It is here and in the sheet… The lock asserts the two agree."* **There is no such lock**, and the sheet says `--tl-text-inset: 13px`. |
| `MARK_W` (`TCP:222`) | 22 | *"matching `--mk` in the stylesheet"* — the sheet says `--mk: 16px`. |
| `CARD_BADGE_PX` (`TCP:129`) | 20 | superseded by the live `--badge: 20px` token |
| `MONTH_SHELF_FROM` (`TCP:184`) | 3 | the shelf gate it named was removed — *"THE MONTH TIER IS UNCONDITIONAL NOW"* (`TCP:3117`) |
| `PILL_INSET` (`TCP:217`) | 13 | — |
| `CONTENT_MARGIN_R` (`TCP:225`) | 12 | — |
| `ROW_DOT` (`TCP:215`) | 18 | *"both take this size, because if they did not the names beside them would start at two different x's"* |

Two of these are the **comments-are-not-guards** fault in its purest form: a comment claiming a
lock keeps two numbers together, no lock, and the numbers have since drifted (14 vs 13, 22 vs 16).
Nothing renders wrongly — the sheet's tokens are what paint — but a reader takes these as the
geometry contract.

**They must not travel.** Moving them into `src/components/shared/timeline/` would transplant dead
code and false laws into a new shared module, where the next reader would trust them harder.
Decision needed from Nick: delete in the extraction commit, or leave in `TodoCalendarPage` and
delete separately. Recommend deleting them in the extraction commit and saying so in the message —
they are not To-do's, they are nobody's.

### ⚠️ F-2 · `TimelineRow` is already taken

`src/lib/todoTimeline.ts` exports a type named **`TimelineRow`** (`TCP:83`), and the brief's Step 2
introduces a different `TimelineRow` in `src/components/shared/timeline/`. Two types, one name,
one import graph. Run B's adapter would sit between them.

Resolve before Step 2 writes a line: either the shared type takes another name (`BoardRow`?), or
`todoTimeline`'s is renamed as part of the extraction. Recommend the former — renaming To-do's is a
behavioural-risk edit to a file this run is meant to leave alone.

### ⚠️ F-3 · The brief's `provenance: 'stated' | 'estimate'` is narrower than the data

Step 3's type offers two provenances. The board has **three sources** plus a separate window fact:
`NamedEndSource = "window" | "sendBy" | "reminder"`, returned as `NamedEnds { end, window }`
(`journeyBars.ts:448–459`). `window` is *"the date the AGENCY stated, whether or not it won"* — a
reminder ahead of the window takes the end while the window still decides whether a reply time was
ever given.

Collapsing three to two loses the distinction the board draws. Per the brief's own instruction,
**the type widens**: carry `source` through as the three-member union and keep `window` beside
`end`. Flagged now because it changes Run B's Step 3 signature.

---

## The extraction boundary

**Generic — a timeline of waits.** Everything in sections A, B and C; D1–D4 and D6–D7; E1–E9 and
E11; F1–F4. The bar engine (`journeyBars`), the window (`timelineRanges`), the pill vocabulary
(`calendarPill`), fades (`calendarFade`), sections (`calendarSections`), the sort ladder
(`calendarToolbar`).

**To-do-only.** The `tasks` and `needs` tabs and their counts; task bars (D8) and drag-to-reschedule
(E8); dismissal and resurfacing; `taskFlags`, `userTasks`, `updateUserTask`, `assembleBoardColumns`
(F5–F6); the Notion panel; the sidebar's task blocks; the toast and confirm-ask wiring.

**Undecided, needs Nick.** Board actions (E10) — `actionKindFor` covers both query deeds and task
deeds, so the split runs through the middle of one module. Whether Query Centre gets the action
marks at all is a product call, not an extraction call.

---

## Scale — the one-run question, answered

| | Lines |
|---|---|
| `TodoCalendarPage.tsx` | 3,455 |
| `todoCalendar.css` | 2,853 |
| `todoCalendar.ts` | 787 |
| `journeyBars.ts` | 1,882 |
| `todoTimeline.ts` | 1,256 |
| `timelineGroups.ts` · `timelineViews.ts` · `timelineRanges.ts` | 494 |
| nine `calendar*/cardC/actionKind/stageSentence/taskBars` libs | 1,243 |
| **total** | **11,970** |

plus **53** `cal*.measure.ts` and **20** `src/components/todo/*.test.ts(x)` touching the board.

---

## The lock baseline — 105 passed, 40 failed, on `main` with nothing changed

Run from a clean detached worktree at `HEAD`, `build:dev`, `vite preview` on 127.0.0.1:4671, all
53 `cal*.measure.ts`. **19.5 minutes. 145 cases: 105 pass, 40 fail.** No file was edited; these are
`main`'s own reds.

That is 28% of the board's measured coverage red before the extraction starts, which changes what
the safety net is. The brief's Step 5 acceptance — *"all its locks green"* — is not a state this
board has been in. **The gate for Step 2 is therefore the 105, named individually**: every case
passing today must still pass. The 40 are recorded here with their version so no future run
mistakes one of them for damage the extraction did — **Run B's report must show the same 40 and no
others.** A gate that has never passed cannot detect anything; it only ever gets rebaselined.

⚠️ **AND THE REAL COVERAGE OF THIS EXTRACTION IS 105 CASES, NOT 145.** A case whose first assertion
fails is silent, not green — every assertion below it is unproved and an unknown number behind
these 40 have not executed in some time. That is the number to hold in mind when the DOM diff comes
back clean: a clean diff is checked by 105 cases, and the board has 145.

### The failing files

| File | Cases red |
|---|---|
| `calViews54` · `calSurface60` | 5 each |
| `calSurface58` · `calScheme62` | 4 each |
| `calWindow58` | 3 |
| `calV40` · `calTint54` · `calText` · `calTask54` · `calSemantics58` · `calRowHead` · `calProbe60` · `calBar63` | 2 each |
| `calShot54` · `calRowWords55` · `calMast64` | 1 each |

Every one of them is a **versioned suite older than the board** — v40, 54, 55, 58, 60, 62, 63, 64
against a board at v65. This is the shape CLAUDE.md already names: *"WHEN A STRUCTURAL CHANGE
LANDS, EVERY SUITE PREDATING IT IS PRESUMED VACUOUS UNTIL RE-PROVED RED."* And because a case whose
first assertion fails is silent, an unknown number of assertions **behind** these 40 have not run
in some time.

### The two `calBar63` reds, diagnosed as asked

Both are **fixture gaps caught by the suite's own anti-vacuity guards** — not board defects, and
**not the constant drift**.

**(d7) `a nudge is stated in the band AND marked on the bar`** — fails at its population floor:

```
Error: no nudged card — the case is vacuous
nudge notes: []
```

The harness account has no nudged query in the 90-day window, so there is nothing to assert
against. The guard is doing exactly its job.

**(d9) `every size is the ref's, in px, within half a pixel`** — fails at *"every key must have
been seen"*, not at any size:

```
sizes seen: {"status":["12.5px"],"holder":["7px"],"name":["15.5px"],
             "agency":["12px"],"fact":["12px"],"tail":["8px"],"bang":["13px"]}
```

Seven of the eight keys measured, **every one exactly on target** (12.5 / 7 / 15.5 / 12 / 12 / 8 /
13). The missing key is `note` — the nudge note — absent for the same reason as (d7): no nudged
card exists to carry one.

**So (d9) is NOT the drift surfacing — the "same fault surfacing" hypothesis was wrong.** It is a
**fixture gap masquerading as a size failure**, which is a better fault than the one guessed at:
a size lock that reports a size problem when no size is wrong. `TEXT_INSET` and `MARK_W` are dead (F-1) and paint nothing,
and (d9) measures font sizes, which are all correct. The two reds are one cause: **a fixture
missing a nudged query.** That is its own follow-up — two locks about the nudge band have been
unprovable — and it is not this run's work.

**Provenance.** `calBar63.measure.ts` was written for v63; the board is at v65 (`078fca09`, 3 days
ago). Neither red is attributable to a code change — both are the absence of a data state on the
shared harness account, so they would have gone red the day that account stopped carrying a nudged
query, silently, whenever that was.

### FOLLOW-UP WORDING, DELIBERATELY: "the test presses a label that does not exist; it fails open" — NOT "the window pager is broken"

`calWindow58` fails with `the window did not move (still 29) — the step is a no-op`, which reads
like the control that replaced the zoom is dead. It is not.

The test presses a button by accessible name: `step(page, "Previous window")`. The board's buttons
are `aria-label="Back one week"` and `"Forward one week"` (`TCP:3060`, `:3063`). The helper is

```js
const b = [...document.querySelectorAll("button")].find(x => x.getAttribute("aria-label") === label);
if (b) b.click();
```

— **it fails open.** No button matched, nothing was clicked, the window did not move, and the
assertion then reported the step as a no-op about a control it never pressed. A stale selector plus
a silent-no-op helper, which is the family this repo keeps rebuilding.

**This matters for Run B**, which mounts exactly this control: the week pager works.

---

## The pre-extraction capture — the safety net

`reports/calendar-extract-dom/`, taken at `HEAD` before anything moved. The tool that made it is
`tests/e2e/calDomCapture.measure.ts`, kept so Run B produces its `after` set identically
(`SA_DOM_TAG=after`).

| File | |
|---|---|
| `board-{1280,1440,1920}-before.html` | `.tl` subtree `outerHTML`, 72,092 bytes each |
| `geo-{1280,1440,1920}-before.json` | viewport, `.tl` and lane widths, `--row-h`, `--tl-days`, and the first eight `.tl-p` rects |

### ⚠️ The three HTML captures are byte-identical, and that is the design rather than a broken probe

Same md5 at all three widths. The probe asserts `window.innerWidth === w` before writing, and the
geometry file proves the viewport genuinely differed:

| width | `.tl` | lane | `--tl-days` |
|---|---|---|---|
| 1280 | 688 | 648 | 90 |
| 1440 | 848 | 808 | 90 |
| 1920 | 1328 | 1288 | 90 |

The board positions everything in `cqw` against `--tl-days` (A4), so **no width ever reaches the
markup** — the DOM is width-independent by construction. That makes the HTML a clean invariant to
diff, and it is also why the geometry is captured beside it: a width-dependent CSS regression
cannot show up in the HTML, so the HTML alone would be a net with a hole in it.

`--tl-days = 90` at all three widths is also the one-window fact (§3) confirmed on the rendered
page rather than read off the table.

---

## Where the board's seam actually is — measured for Step 2

```
.tl-page
  .tl-cal.tl-board[data-dens]
    aside.tl-axis          ← the sidebar          (To-do)
    .tl-boardpane
      .tl-winbar           ← week pager · search · density
      TplZone.tl-zone
        .tl  [--tl-days]   ← THE BOARD ROOT — the captured subtree
          .tl-rail         ← month shelf · week tiles
          rows region      ← sections · rows · bars · marks
```

`.tl` is a clean subtree: the rail and the rows, nothing else. The sidebar and the winbar are
siblings outside it. So `TimelineBoard` is `.tl` plus the winbar as its own bar, and the To-do
sidebar stays behind — which is the split the brief describes, and the DOM capture is already
scoped exactly to it.


---

## Follow-ups for the To-do stream — none of them this run's work

1. **A nudged query in the harness account, inside the 90-day window.** `calBar63` (d7) and (d9)
   are both unprovable without one; (d9) reads as a size failure and is not.
2. **`calWindow58`'s step helper presses a label that does not exist and fails open.** It asks for
   `aria-label="Previous window"`; the board renders `"Back one week"` / `"Forward one week"`. The
   helper is `if (b) b.click()`, so nothing is pressed and the case then asserts a no-op. **Stated
   this way on purpose: the pager works.** Written as "the window pager is broken" it costs
   somebody a day.
3. **Seven dead geometry constants in `TodoCalendarPage`** (F-1), two of them asserting locks that
   do not exist against tokens that have since drifted (`TEXT_INSET` 14 vs `--tl-text-inset: 13px`;
   `MARK_W` 22 vs `--mk: 16px`). Not carried into the shared module, not touched in To-do.
4. **The 40 red cases are versioned suites older than the board.** Each needs the CLAUDE.md
   treatment — a lock asserting a retired decision is deleted, not inverted — and each is hiding
   however many assertions sit behind it.


---

# Step 2 — the extraction, first half: the board's leaves

**Landed and proved. `TodoCalendarPage.tsx` 3,456 → 2,812 lines; 646 moved.**

`src/components/shared/timeline/boardParts.tsx` now holds the board's presentational leaves — the
card (`Piece`), the markers (`Marker`, the four glyphs), the action mark (`ActionMark`/`ActionSym`),
the geometry helpers (`pct`, `barLeft`, `barWidth`, `laneVar`) and the `DrawnGroup` shape. All were
already module-scope in the page and closed over nothing from the component, which is what made
this the safe first move.

`src/components/shared/timeline/types.ts` states the **data contract** — `BoardRow`, `BoardBar`,
`BoardMark`, `StateToken`, `BarEndSource`, `BoardWindow`. This is what Run B's adapter targets.

### The move is verbatim, and that is measured rather than asserted

`git diff` on the page: **8 insertions, 652 deletions.** Every inserted line is the import and its
comment. Comparing the removed lines against the new file, **zero removed lines are absent from
`boardParts.tsx`**; the only differences are eight `export` keywords and the deliberate relocation
of `STAGE_BAND_DOT_PX` (which the page no longer reads).

### The DOM is byte-identical at all three widths

| width | HTML | geometry |
|---|---|---|
| 1280 | identical, 72,092 bytes | identical |
| 1440 | identical, 72,092 bytes | identical |
| 1920 | identical, 72,092 bytes | identical |

Both captures were taken at the same base (`e32e2734`) with only the extraction between them —
a controlled comparison. `main` moved during the run (three `dash:` commits), and
`git diff --name-only e32e2734..main` touches **no calendar, timeline or todo file**, so the base
difference cannot reach the board. Scoping the capture to `.tl` rather than the page also means the
shell changes in those commits are outside it by construction.

### The locks: zero newly red

| | before | after |
|---|---|---|
| passed | 105 | **106** |
| failed | 40 | 39 |

**Newly red: none.** That is the gate, and it is clean.

**Newly green: one, and it was flake, not a repair.** `calScheme62` (3) failed in the baseline at
`measure.ts:134` — `expect(locator).toBeVisible()` on the shell, timing out at exactly 30s during a
53-file run. A sign-in timeout, not a board assertion. The extraction moved the card and the
markers; neither draws the rail that case is about.

**And the flake was masking a real red.** Its sibling `calScheme62` (2) was *also* a sign-in flake
in the baseline; in the after-run it reached its assertion and failed properly:

```
Error: the rail is inset from the container's left
  Expected: < 1.5   Received: 251
```

A v62-era claim about a rail that has since gained a 251px inset — stale-design, like the other 38,
and nothing to do with this change. This is the silent-first-failure point in miniature: **a flake
hid a real failure, and the count looked one better than the truth.**

**So the honest pre-existing set is 39, not 40**, and the gate for Run B is **the 106**:

- 38 cases failed identically in both runs — stale versioned suites (v40–v64 against a v65 board).
- `calScheme62` (2) is the 39th: flake-masked in the baseline, genuinely red for a stale reason.
- `calScheme62` (3) genuinely passes; it was only ever a sign-in timeout.

**Run B must show these same 39 and no others.**

### One lock was retargeted, and it was proved red

`calendarStyleReach.test.ts` swept `TodoCalendarPage.tsx` for every `tl-*` class the board renders
and required each to have a base rule. With `Piece` moved, the sweep stopped seeing `tl-p` — and
**its own floor case caught that**, rather than the population silently shrinking and the sweep
going green over less than it used to cover.

The law — *every class the Calendar renders has a base rule in its own stylesheet* — is unchanged by
the move; what changed is where "renders" is written. The sweep now reads both files. Proved red by
planting a ruleless class **in the moved file**:

```
rendered with no rule at all: expected [ 'tl-notarule' ] to deeply equal []
```

then green on restore. It genuinely reaches the new module; it is a retarget, not a weakening.

### Gates

tsc clean · production build read, no diagnostics · **7,689 unit tests green across 463 files**.

---

## What remains of Step 2, for Run B or a Run A continuation

The leaves are out and the contract is written. Still in `TodoCalendarPage`:

1. **The `.tl` JSX** — the rail and the rows region (~200 lines). It closes over roughly twenty
   locals, so moving it means an explicit props interface; the DOM capture already covers exactly
   this subtree, so the proof is in place before the work starts.
2. **`row()`** (~180 lines) — nearly generic already: it reads `barsByRow`, the row's own fields and
   `Piece`. The To-do specificity is in the DERIVATION that builds those, not in the markup.
3. **The adapter direction.** `BoardRow` is written; nothing maps to it yet. To-do's mapping and
   Query Centre's (`src/lib/queryTimelineRows.ts`, Step 3) are the two callers that will prove the
   contract is honestly generic — a contract with one implementer has not been tested.
