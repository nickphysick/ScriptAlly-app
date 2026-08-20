# Calendar — post-review fixes

**Session:** `calendar` · 20 Aug 2026 · deployed dev site, signed in, Playwright.
**Instrument:** `tests/e2e/calFold.measure.ts` (new, calendar-local). Scrollbar width **0px** on this
machine — the harness's known blind spot, stated per the standing rule.

Nick's rulings recorded: the `tasksViewport.test.tsx` retarget is **confirmed**; **"Yours" stands**.
Both closed.

---

## Phase 0 — MEASURED

### ⚠️ The pack's diagnosis is wrong, and so were both of my own prior flags

The pack proposed: `calFoldCap` measuring a collapsed row (a third `flex:1; min-height:0` silent
box), compounded by the fold not reserving the counter's line. **Neither is happening.** So is my
own report's guess that the panel's new grid track changed what the `ResizeObserver` sees. The
measurements:

| | 1440 × 900 | 1920 × 900 |
|---|---|---|
| `.cal-grid` clientHeight | 638px | 638px |
| DOW row offsetHeight | 13px | 13px |
| **rowPx** | **104.17px** | **104.17px** |
| room = rowPx − 26 | 78.17px | 78.17px |
| fits = floor(room / 19) | 4 | 4 |
| **`calFoldCap(rowPx)`** | **3** | **3** |
| resolved row tracks | `16.77px` + 6 × `97.53px` | identical |
| pips actually rendered | **18** | **18** |

**`calFoldCap` is returning the correct cap, from a correctly-measured row, at both widths.** The
fallback never needed to engage. The grid is 638px, the cells are 97.53px, nothing is collapsed.
**Pips do render — eighteen of them.** The symptom is real; the diagnosis was not.

### ⚠️ AND THE MIN-HEIGHT CHAIN IS HEALTHY — this is NOT a third occurrence

Walked up from `.cal-grid` (never queried by class — see below), at 1440:

```
div.ws-window              h= 811.75   flex=1 1 0%
div.ws-wbody.sv2-stagepad  h= 809.75   flex=1 1 0%   ovY=auto
div.ws-work.ws-work--fit   h= 809.75   flex=1 1 0px
div.t-f12.spine-root       h= 809.75   flex=1 1 0%
div.tdb-wrap.today-off     h= 809.75   flex=1 1 0%
div.tdb-col.tpl            h= 809.75   flex=1 1 0%
div.wpg.wpg--tools         h= 809.75   display=grid
div.wpg-scroll             h= 661.75   ovY=auto
div.tpl-cols               h= 661.75   flex=1 1 0%
div.tpl-body               h= 661.75   flex=1 1 0%
div.cal-layout             h= 661.75   display=grid
div.cal-main               h= 661.75
div.cal-grid               h= 638
```

**Not one zero.** `.tpl-body` is 661.75px. The day panel's grid track did not break the chain.

> **⚠️ MY FIRST READING SAID IT DID, AND THAT WAS A MEASUREMENT ARTEFACT WORTH RECORDING.** Querying
> `document.querySelector(".tpl-body")` returned **0px** — and it was the To-do list page's copy.
> Every workspace page stays MOUNTED (the shell toggles `display`), so a bare class query returns
> whichever is first in the document, and a hidden page measures 0. Exactly the shape CLAUDE.md
> already records for `ScriptAllyLogo`'s DOM id. **On this app, a measurement probe must reach its
> element by walking up from something known to be on the visible page, never by class.** The fixed
> probe does that, and the chain is fine. Had I reported the first reading, "third occurrence of the
> silent-box class" would have gone into CLAUDE.md as a fact, and it is not one.

### ⚠️ THE ACTUAL CAUSE: a `cal-` class-name collision across three global stylesheets

`.cal-d` — the day-numeral row — measures **76.28px in a 96px cell**, *including in empty cells
where it is the only child with `flex-grow: 0` and a 12px line-height*. Its `outerHTML` is
`<div class="cal-d">27</div>`. Enumerating every CSS rule the browser matched to it:

```
.cal-d { aspect-ratio: 1 / 1; border-radius: 8px; cursor: pointer;
         font-family: var(--f12-body, "Inter", sans-serif); ... }      <- todo.css:1599
.cal-d { font-family: "JetBrains Mono"…; font-size: 8px; color: #b3a394; display: flex; }
                                                                       <- todoCalendar.css:48 (mine)
```

**`src/components/todo/todo.css:1599` styles a completely different `.cal-d`** — the
RecordingCalendar's square day *button* in the journey date picker. A CSS import is global
regardless of which component mounts, so both rules are live on this page. Mine is later in the
bundle and wins for the four properties it declares — **but it never declares `aspect-ratio`, so
`aspect-ratio: 1` survives unopposed** and squares the numeral row to the cell's content width.

Confirmed by bundle offsets:

| selector | `todo.css` | later rule (mine / shared) | what bleeds through |
|---|---|---|---|
| `.cal-d` | @781572 `aspect-ratio:1` | @1034276 (mine) | **`aspect-ratio: 1`** |
| `.cal-nav` | @780790 `width:26px;height:26px` | @830029 `taskChrome.css` sets `height:32px` | **`width: 26px`** |
| `.cal-dow` | @781217 `display:grid; gap:2px; margin-bottom:4px` | @1033862 (mine) | **`display:grid`, `margin-bottom`** |
| `.cal-grid` | @781505 `gap:2px` | @1033722 (mine, `gap:6px`) | nothing — mine redeclares it |

**This one cause produces every symptom in the review, which is why they all appeared at once:**

1. **Pips illegible.** `.cal-d` at 76px leaves ~20px for three pips and a counter. The cell is a
   fixed-height flex column and flex items shrink by default, so all three pips are squashed to
   **8px** with their text clipped — measured, every populated cell, both widths:
   ```
   day 12  n=3 more=Y  cellClientH=96  .cal-d=76.28  .cal-more2=12
           pip heights=[8,8,8]  clipped=[true,true,true]
           font=8.5px/12.75px  flex-shrink=1
           cell scrollHeight=136 vs clientHeight=96  => OVERFLOWING
   ```
   **They shrink rather than being dropped, which is why every count assertion passed while the
   month looked empty.** What Nick saw as "only a numeral" is the numeral's own 76px box.
2. **Prev/next are empty squares.** `.cal-nav` inherits `width: 26px`. The chevron SVG is present
   (`svgs: 1`, measured) inside a button too narrow to show it — and "Today" is also 26px wide.
3. **"The record" wraps to two lines with the swatch orphaned.** Same `width: 26px`: measured
   `recBtn w=26, h=32, lines=2`. It is not a `white-space` problem.
4. **Weekday names look unstyled and floating.** `.cal-dow` inherits `display: grid` and
   `margin-bottom: 4px` from a rule describing a seven-column *container*, applied to each of my
   seven *cells*.

### The day panel's track — correct at both widths

| | 1440 | 1920 |
|---|---|---|
| `.cal-layout` resolved columns | `682px 370px` | `1162px 370px` |
| panel column w × h | 370 × 661.75 | 370 × 661.75 |
| panel head | `20 August`, `6 ITEMS · 6 YOURS` | identical |

**The panel is exactly on its intended 370px track and full-height.** The one thing my last report
flagged as most likely wrong is the one thing that is right.

### The 1080 collapse — engages, panel visible

At 1000 × 900: `.cal-layout` resolves to a single `639.516px` column, `overflow-y: auto`,
grid `640 × 420` at top 259, panel `640 × 325` at top 596 — **both in view**, page scrolls as
designed. Working.

### Screenshots

`reports/calendar-fixes/month-1440.png`, `month-1920.png` — committed as evidence with this phase.
The 1440 shot shows the squashed pip bars at the cell foot, the black box on today, the blush on
past days, the two empty nav squares, and "The record" wrapped over two lines.

---

## Consequence for Phase 1

The pack's Phase 1 was written against a diagnosis the numbers do not support. Per its own
instruction — *"every later phase is written against its numbers"* — Phase 1 addresses what was
actually measured:

- **Not needed: moving the `ResizeObserver`.** It observes `.cal-grid`, which is 638px and correct.
- **Not needed: the 0px fallback path.** `calFoldCap` never receives 0 in the running app.
- **Still needed, and my own standing flag: reserve the counter's line.** With `.cal-d` restored to
  ~13px the cell has room for 3 pips *or* 2 pips + a counter, not 3 + a counter — so the
  ref's rule (items ≤ cap → show all; items > cap → cap−1 pips + the counter on its own line) is
  right and is implemented.
- **Newly needed, and the actual fix: end the collision structurally.** Renaming this page's private
  classes off the shared `cal-` prefix is the only fix that cannot silently regress the next time a
  property is added to `todo.css` — neutralising `aspect-ratio` one property at a time is vigilance,
  not a guard.

---

## Phase 1 — after the fix, re-measured on the locally-built dev bundle

`npm run build:dev` (target guard: *"bundle targets scriptally-dev; gen-lang-client-0801391782
absent"*), served at `localhost:4180`, harness pointed at it via `SA_E2E_BASE_URL`.
**⚠️ `npm run preview` on a plain `vite build` would have served a PROD-targeted bundle** — signing
in would have touched production data. The launch entry runs `build:dev` for exactly that reason.

### Before → after, at 1440 (1920 identical)

| | before | after |
|---|---|---|
| `.cal-d` height | **76.28px** | **12.75px** |
| pip heights | `[8, 8, 8]` | `[20.75, 20.75]` (and `[19.8 × 3]` where nothing folds) |
| pip text clipped | `[true, true, true]` | `[false, false]` |
| cell scrollHeight vs clientHeight | **136 vs 96 — OVERFLOWING** | **96 vs 96 — fits** |
| `fits = floor(room / CAL_PIP_H)` | `floor(78.17 / 19) = 4` | `floor(78.17 / 25) = 3` |
| `calFoldCap(rowPx)` | 3 | 3 *(same answer, now for the right reason)* |
| a 12-item day | 3 pips **+ counter** crushed into room for 3 | **2 pips + counter**, `+10 MORE` |
| `.cal-recbtn` width | **26px**, wrapped | **89.84px** |
| prev / next / Today width | 26 / 26 / 26 | **35 / 35 / 53.89** |
| month ÷ panel track | 682 / 370 | 682 / 370 *(unchanged — it was always right)* |

**Pips are legible in every populated cell** — the 1440 screenshot reads `Closed David…`,
`Holding reply`, `Nudge Tom Ell…`, `Noah Bright h…`, and the counters `+10 MORE` / `+4 MORE`.
`calFoldCap` returns the same 3 it always did; what changed is that the cell can now honour it.

### What the fix was, precisely

- `.cal-layout .cal-d` and `.cal-layout .cal-dow` — ancestor-scoped (0-2-0) with an **explicit
  reset** of every property `todo.css` sets that this sheet does not. Scope alone would not have
  helped: specificity cannot beat a property you never declare.
- `.tpl-tools .calm-nav` — a page-local modifier undoing `width: 26px`. `.cal-nav` itself is
  **not** re-declared; it is shared chrome.
- `CAL_PIP_H` 19 → **25**, browser-measured.
- `cellSlots` reserves the counter's slot, which its own comment had claimed and the arithmetic
  never did.

### ⚠️ Two of the To-do session's locks caught my first attempt, and both were right

The first version put a `calm` class on `.t-f12.spine-root` and wrote `.calm .cal-nav { … }`.
`tasksViewport.test.tsx` went red twice: once on its law that **all four Tasks pages wear the same
column**, and once on its ban on this sheet **re-declaring the shared control** — which my scoped
rule tripped as a *substring* (`".cal-nav {"`). Both objections were correct, and the fix was mine
to change, not theirs. The scopes are now existing ancestors and the nav takes a modifier. **Their
files are untouched.**

---

## Phases 2–5, and Phase 6 acceptance

| Phase | Commit | What |
|---|---|---|
| 2 | `5d19fedf` | the month becomes one ruled panel |
| 3 | `6fe139b8` | cell anatomy — numeral box, today as a disc, two caps |
| 4 | `f9e1f178` | the record's chip reads as one control |
| 5 | `78367424` | the count line becomes legible; one record layer in the legend |

### Acceptance — assertions, not prints

`tests/e2e/calFold.measure.ts` gained a second test that **fails** rather than reports. Run against
the dev-targeted local build at 1440, 1920 and 1000:

```
@1440 OK — 6 populated cells, panel 370×662, count "6 ITEMS"
@1920 OK — 6 populated cells, panel 370×662, count "6 ITEMS"
@1000 OK — one column, grid 420px, panel 640×325
```

Every claim the pack asked for, checked on the rendered page at both widths:

| Claim | How it is asserted | Result |
|---|---|---|
| pips visible in every populated cell | `shown > 0`, `minPipH > 15`, per cell | 2 pips, min 24.75px |
| no pip clipped, no cell overflowing | `scrollHeight <= clientHeight`, `p.scrollHeight <= p.clientHeight` | `101 vs 101` — fits |
| counter **only** where items exceed the cap | `hasMore === (shown < total)`, per cell | holds on all 6 |
| today's disc rendered | `.cal-cell.today .cal-dn` background | `rgb(124, 58, 42)` |
| today draws no box | `.cal-cell.today` border-top width | `0px` |
| no wash on past days | past cell's ground **vs its future twin in the same column** | identical |
| the past says so quietly | past `.cal-dn` colour | `rgb(195, 179, 164)` |
| the record toggle on one line | `white-space`, height < 40, `scrollWidth <= clientWidth` | `nowrap`, 32px, not clipped |
| panel at its track width | `.cal-focus` width | **370** at both |
| `.tpl-body` non-zero | walked up from `.cal-grid` | 661.75 |
| 1080 collapse functioning | resolved column count, panel height, grid floor | 1 column, panel 640×325, grid 420 |

### Two more first-match slips, both caught by their own tests

Worth recording because they are the same family as the `.cal-d` collision itself — a name that is
a *prefix or suffix* of another live name:

1. `indexOf(".cal-dow {")` also matches `.cal-layout .cal-dow {` — the Phase 1 reset — so a Phase 2
   assertion sliced the wrong block. The helper is anchored to a line start now.
2. `indexOf("cal-recbtn")` finds **`cal-recbtn2`**, the day panel's action button, which sits
   earlier in the file. Anchored on the exact `className` now.
3. In the acceptance run itself, `querySelector(".cal-cell.past")` returned **27 July** — which is
   also `.off`, so it legitimately paints the adjacent-month ground and said nothing about the
   wash. The check now compares a past cell against **its future twin in the same weekday column**,
   which is the question actually being asked.

All three went red before they could go falsely green, which is the only reason they are footnotes
rather than findings.

### The cap, and why it is 2 rather than 3 at a 900px viewport

The numeral's fixed 20px box took `CAL_CELL_CHROME` from 26 to 33, and that alone dropped a busy
day to **one** pip — measured, not predicted. The cause was reserving a whole 25px pip slot for a
12px counter. The fold now asks two questions:

- `calFoldCap(rowPx)` — how many pips fit **alone**
- `calFoldCapFolded(rowPx)` — how many fit **beside** the counter

At the shipping size these are the same number, which is exactly the row the single-cap version was
throwing away. A taller viewport returns a third pip (`rowPx >= 108`); this is a real consequence of
the disc's size, not a regression.

---

## Deployed to dev

**https://scriptally-dev.web.app** → Tasks → Calendar. Hosting-only; no rules, no functions.

Checklist, in order:

- `git fetch` → **0 behind** origin/main (55 ahead — the four sessions' unpushed work)
- **⚠️ Source was NOT clean at build time** — see the flag below
- `tsc` **0 errors**
- `npm run build:dev` exit 0, whole log grepped (only the chunk-size note), target guard:
  *"bundle targets scriptally-dev (dev); gen-lang-client-0801391782 absent"*
- `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`
- Verified against the **live** asset `/assets/index-D_z8rBbN.css`, not `dist/`: the three collision
  resets, the parchment panel, the sage band, today's disc, the 9px count line and the legend rule
  are all present, and `.cal-cell.past` sets **only** `color: #c3b3a4` — no wash.
- **Acceptance re-run against the deployed site** (not just the local build): passes at 1440, 1920
  and 1000.

---

## FLAGS FOR NICK

### 1. What Phase 0 found — and it is **not** a third silent-box occurrence

**Nothing was collapsed.** `calFoldCap` returned the correct 3 from a correctly-measured 104.17px
row at both widths, and every ancestor from `.cal-grid` up to `.ws-window` measured 638–900px.

The cause was a **class-name collision**: `todo.css:1599` styles a different `.cal-d` — the
RecordingCalendar's square day *button* — and a CSS import is global whatever mounts. This page's
rule is later in the bundle so it won the four properties it declared, but it never declared
`aspect-ratio`, so **`aspect-ratio: 1` survived and squared an 8px numeral row to 76.28px inside a
96px cell**. The three pips then **flex-shrank to 8px with clipped text** rather than being
dropped — which is exactly why every count assertion passed while the month looked empty. The same
collision gave `.cal-nav` `width: 26px` (empty prev/next glyphs, "The record" wrapping) and
`.cal-dow` `display: grid` (the unstyled weekday row). **One cause, all four symptoms.**

> **⚠️ For CLAUDE.md, the honest entry is not the silent box — it is this:** *on this app a
> measurement probe must reach its element by walking up from something known to be on the visible
> page, never by class.* My first Phase 0 reading said `.tpl-body` was 0px and that a third
> `min-height:0` collapse had happened. It had not — `document.querySelector(".tpl-body")` returned
> the **To-do list page's** copy, which is mounted-but-hidden. Every workspace page stays mounted.
> Had I reported that first reading, a fact that is not true would have entered CLAUDE.md.

**And the second entry worth having: a class name is a global.** Three stylesheets in one directory
share the `cal-` prefix for three different components. The guard now in
`todoCalendar.test.ts` re-derives the bleed set from `todo.css`, `taskChrome.css` and this page's
sheet and **fails if `todo.css` ever gains a `.cal-*` property this page neither declares nor
resets** — verified red by deleting the `aspect-ratio` reset.

### 2. Before/after fold-cap numbers, both widths

Identical at 1440 and 1920 (the grid's height does not vary with width):

| | before | after |
|---|---|---|
| `.cal-d` | 76.28px | **12.75px** → **20.75px** (Phase 3's numeral box) |
| pip heights | `[8, 8, 8]`, all clipped | `[24.75, 24.75]`, none clipped |
| cell | `scrollHeight 136 vs 96` — overflowing | `101 vs 101` — fits |
| `CAL_PIP_H` | 19 (the ref's estimate) | **25** (measured 24.75, rounded up) |
| `CAL_CELL_CHROME` | 26 | **33** (the 20px numeral box) |
| `calFoldCap(104.17)` | 3 — for the wrong reason | **2**, plus `calFoldCapFolded` = 2 |
| a 12-item day | 3 pips crushed against a counter | **2 pips + `+10 MORE`** |

The cap is 2 rather than 3 at a 900px viewport because the disc's 20px box costs seven pixels of
chrome. A taller viewport returns the third pip at `rowPx >= 108`. **The two-cap model is what
recovered the second pip** — a single cap reserved a whole 25px slot for a 12px counter and
rendered one.

### 3. What fought `TasksPageLayout`, and how it was resolved inside my own files

Nothing fought the chassis itself — the panel still lives in `children` and `TasksPageLayout` is
untouched. What fought me was **two of the To-do session's locks, and both were right**:

- My first fix put a `calm` class on `.t-f12.spine-root`. `tasksViewport.test.tsx` asserts that
  **all four Tasks pages wear the same column**. Correct law; I withdrew the class.
- My first `.calm .cal-nav { … }` rule tripped their ban on this sheet **re-declaring the shared
  control** — by substring (`".cal-nav {"`). Also correct: it is shared chrome.

Resolved entirely in my files: the scopes are now **existing ancestors** (`.cal-layout` for the
grid, `.tpl-tools` for the controls) and the nav takes a page-local `.calm-nav` modifier that
un-bleeds the width without redefining anything shared.

### 4. Cross-session ride-alongs, and one collision to pass on

**⚠️ The deploy carries eight uncommitted files of the To-do session's in-flight pane work**, and
their tree was oscillating red/green while I waited (~3 min). At build time `tsc` was 0 and the
build was clean, but **two of their style locks were red** — `recordingCalendar.test.ts` ("the
card's Action is ink-filled") and `tasksViewport.test.tsx` ("the page's pink buttons take ink").
Both are source-string style assertions on **their** pages, not runtime breakage, and the calendar
is unaffected — but the To-do pane on dev right now is mid-change, not finished work. I did not
touch, revert or stash any of it.

Files riding along uncommitted: `TaskPane.tsx`, `ToDoPage.tsx`, `taskPane.css`,
`taskPaneJourney.tsx`, `taskPanePort.test.tsx`, `tasksViewport.test.tsx`,
`recordingCalendar.test.ts`, `tests/e2e/paneRound.measure.ts`.

**One collision to pass to whoever owns `taskChrome.css`:** `todo.css`'s `.cal-nav` pins
`width: 26px` and `taskChrome.css` never restates it, so **the same bleed is live on the Noteboard
and the To-do list**, whose tool rows wear the same control. I fixed it for this page only — their
sheet is not mine. My change also orphans `.cal-viewwrap` in `taskChrome.css` (nothing renders it
since the Week view retired); `.cal-viewmenu` beside it is still live for the Noteboard.

### 5. What I could not verify

Very little this time, and that is the difference the harness makes:

- **The scrollbar**, as always — 0px on this machine, the instrument's one blind spot. A
  classic-scrollbar question still needs your own browser.
- **Other viewport heights.** Everything is measured at 900px tall. The cap is height-sensitive by
  design, so a 1080px-tall screen will show three pips where these numbers show two. That is
  intended, not unverified — but I have not seen it.
- **The record layer with real history on screen.** The harness account's August has six populated
  days and the record entries visible are `Holding reply` and `Closed …`. I have not seen a month
  dense with record entries, so the layer's *density* at scale is unmeasured.
- **`prefers-reduced-motion`** is declared and not exercised.
