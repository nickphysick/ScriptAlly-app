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
