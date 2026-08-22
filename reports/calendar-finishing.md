# Calendar — the finishing pack

**Session:** `calendar` · 22 Aug 2026, overnight, unattended.
Prior: `calendar-record-layer.md`, `calendar-fixes.md`, `calendar-dedupe.md`, `calendar-pills.md`,
`calendar-peek.md` (recon only), `calendar-reclaim.md`, `tasks-chassis-21px.md`.

> # ✅ DEPLOYED — **https://scriptally-dev.web.app** → Tasks → Calendar
>
> **All four conditions passed**, and the acceptance was then re-run against the deployed site,
> not only the local preview: `tsc` **0** (0 in owned files), Vitest **6313 passed / 0 failed**,
> build exit 0 with the target guard naming `scriptally-dev` and the prod id absent, and **no other
> session's uncommitted source in the tree** at build time.
>
> Condition 4 had failed for most of the run — the noteboard session was mid-edit on `db.tsx`,
> `types.ts` and two untracked files — and cleared only near the end, when they committed.

---

## Step 0 — gates

| Gate | Result |
|---|---|
| **Red gate 1** — another session mid-edit in `src/components/todo/` | `git status --porcelain` → **empty**. Clear. |
| **Red gate 2** — the chassis fix still in the tree | **INTACT.** `workspaceShell.css:678` carries the deletion *and* the warning comment; no `height: 100vh` on `.ws-main`. |
| `main`, level | behind main **0**; HEAD `e975dbda` ("noteboard: install the approved mockup") — another session's, and moving |
| Whole-tree dirt | 5 files, **no source** — two report PNGs, a deleted run-artifact, two untracked artefacts |
| Baseline `tsc` | **0 errors** |

---

## Step 0 — RECON

### 1. `rolledFrom` still carries each carried item's origin — **yes, unchanged**

`todoCalendar.ts:183` sets `rolledFrom: action` in the roll-forward branch, and `action` is
`cardActionYmd`'s output. Per type:

| Carried type | Origin |
|---|---|
| writer's own task | `c.dueYmd` ← `UserTask.dueDate` |
| query card | `q.lastStatusChange ?? q.dateSent` |
| housekeeping | `null` — never reaches the calendar |

**No carried type lacks a recoverable origin** (flag 4 answered before Phase 5 was reached). Three
existing assertions already pin it, including one on the page's render of `Originally due …`.

### 2. "Everything" is the facet control — **confirmed, and it is entirely calendar-local**

`useState<TodoFacetId>("all")` at `:253`. Consumers: `applyFacet` (`:415`), the two
`facet === "all" ? … : []` gates for user tasks and activities (`:428`, `:429`), `facetCounts`
(`:438`), and the control itself (`:486`–`:501`). **No manuscript scoping anywhere in the page** —
that lives in the shell's sidebar chip, untouched.

### 3. The record toggle — **one reader, so Phase 3 subsumes it by changing one function**

`useState(true)` at `:266`; the single reader is
`recordFor = (ymd) => (showRecord ? recByDay.get(ymd) ?? [] : [])` at `:459`. The grid pills, the
panel section **and the dedupe** all flow from that one call — the dedupe takes the day's record as
an *argument* rather than reading a flag. Plus the legend at `:633` and the button at `:517`.

### 4. Grid start-date inventory — the list Phase 3 must respect

| Site | Assumption |
|---|---|
| `TodoCalendarPage:375` `const visible = monthGridDays(anchor)` | **the only producer of the day range** |
| `:452` `monthLabel(anchor)` subtitle · `:543` grid `aria-label` | the title names the anchor's month |
| `:556` `off = !sameMonth(ymd, anchor)` | adjacent-month dimming |
| `todoCalendar.test.ts:745` | a page lock pinning that exact producer line |
| `todoCalendar.test.ts:755` | 42 cells |
| `tasksAuditBoundary.test.tsx:124` | uses `monthGridDays` as a fixture |

**`grid-auto-rows: minmax(0, 1fr)`** — so fewer weeks means *taller* rows. Any upcoming-mode
geometry with ≤ 6 rows **gains** cushion; none of them can spend it.

### 5. Foot-margin parity — **measured on all three. Calendar matches exactly.**

```
/queries         WINDOW .ws-window ends 880 -> CHASSIS FOOT 20   | lowest ink 892.75 span.f12-nm
/todo            WINDOW .ws-window ends 880 -> CHASSIS FOOT 20   | lowest ink  897.3 div.r-deed
/todo/calendar   WINDOW .ws-window ends 880 -> CHASSIS FOOT 20   | lowest ink    880 div.ws-winwrap
```

**20px on all three, from the same `.ws-main` padding.** The chassis pack's addendum is now
evidenced rather than assumed.

> **⚠️ TWO WRONG READINGS CAME FIRST, AND BOTH LOOKED LIKE ANSWERS.** The first walked for the
> lowest painted box and reported **1959px** on `/queries` — a true measurement of an inner pane's
> *scroll extent*, and nothing to do with a foot margin. The fix for that was to scroll the page to
> its bottom first, which **changed nothing**, because — probed rather than assumed — **all three
> pages FILL: the only page-level scroller on any of them is the sidebar `nav.ws-nav`.** The
> comparable box is the chassis's own window, not the page's ink.

> **⚠️ AND A SIDE-FINDING, NOT MINE TO FIX:** on `/queries` and `/todo` some inner boxes extend
> **past** the window's bottom (892.75 and 897.3 against a window ending at 880). They are clipped,
> so no pixels escape — but the boxes are geometrically outside their frame, which is the
> "measures whole, pixels gone" shape this repo already records. The Calendar's lowest box is the
> window itself. Flagged for whichever session owns those pages; **not touched.**

### 6. Cushion before this pack adds anything — **13 / 4 / 4 / 4**

| width | 1000 | 1280 | 1440 | 1920 |
|---|---|---|---|---|
| cushion | **13** | **4.0** | **4.0** | **4.0** |
| `data-fold-short` | none | none | none | none |

**Not below 4px, so Phase 0B's red condition does not fire.** Exactly where the reclaim pack left
it — nothing has eroded in the day since, which is the first time the grid has held its height
across a session.

---

## What landed

| Phase | Commit | What |
|---|---|---|
| 1 | `55254151` | the v5 design ref |
| Step 0 | `1c0a4e20` | recon + the foot margin measured |
| 2 | `02b7b4f8` | the hover peek |
| 3 | `0abbb486` | two view modes replace "The record" |
| 4 | `20e27652` | event kinds replace "Everything" |
| 5 | `c23752c8` | carried-task origin ghosts |
| 6 | `81842b13` | the action overlay, scoped |
| 7 | `afcd5480` | the acceptance + a pre-existing fault it found |

**Phase 0B held throughout: no phase increased any per-pill or per-cell vertical dimension.**
The peek is portalled and `position: fixed`; the ghost is the same box as every other pill; the
cushion is **13 / 4 / 4** at 1000 / 1440 / 1920 — unchanged from Step 0, to the pixel.

---

## The findings, in the order they cost something

### 1. `const rows = 6` — a latent under-report, found by Phase 3

The fold divided the grid's height by a hard-coded six week rows. True while the month grid was the
only grid; `Upcoming only` shows between one and six. **A hard 6 against a five-row grid divides by
one row too many, so every cell is told it is shorter than it is and the fold caps tighter than it
needs to** — silently, with no error and no overflow to notice. The divisor is now COUNTED from the
rendered cells, which cannot go stale the way a constant can.

### 2. The month painted over the day panel below 1080 — pre-existing, found by the acceptance

Below the breakpoint the layout has a fixed height and its implicit rows were `auto`, so the two
children competed for it. `.cal-grid` asks for a 620px floor while `.cal-main` carries
`min-height: 0` — correct *above* the breakpoint, where it must shrink to the frame — so the parent
resolved to **281px against a 620px child**. The month overflowed its own box by 339px and drew
across `.cal-focus`, whose head sat **321px inside the grid's painted area**.

> **⚠️ NOTHING WAS MISDRAWN — THE MONTH WAS UNREACHABLE.** `elementsFromPoint` over today's cell
> returned the PANEL, so the last three weeks took no hover, no peek and no click while looking
> perfectly normal. That is why it survived: there was nothing to see.

> **⚠️ AND THE OBVIOUS FIX WAS THE WRONG ONE, tried and measured before it was rejected.** Putting
> the floor on the parent cures the overflow and then starves the panel: the grid takes its 620 out
> of a fixed 586 and the day panel measured **six pixels tall** — the same fault from the other
> direction. `grid-auto-rows: max-content` fixes both at once and needs nothing on either child;
> with the floor added as well the numbers are byte-identical, so it was removed as redundant.

**After:** grid 620, panel 377, layout scrolls 1040/586, no overlap — and **≥1080 completely
unchanged** at 539/586 and 561/586, exactly as before.

### 3. Four probe faults of my own — all the precondition family

Recorded because they are the failure mode this pack is built to avoid, and I hit it four times:

| What I wrote | Why it was wrong |
|---|---|
| switch off **"Agent responses"** | this month contains none — the filter worked and the probe called it broken. Derived from the data now. |
| ghosts guarded by `if (count > 0)` | reported **zero ghosts at every width**, passing by measuring nothing. Every origin is in June/July, outside August's grid. It navigates back to find them. |
| pair the ghost against today's **cell** | the cell is *capped*; a folded pill read as missing. It reads the **peek** — the uncapped set — verifying both at once. |
| `locator.hover` / `locator.click` | **hung for seven minutes** on actionability: every workspace page stays mounted, so the selector matched a hidden page's copy. Every pointer action is now driven to a measured point. |

### 4. A staleness bug fixed while wiring Phase 5

`armPeek` is memoised and closes over `itemsFor`/`recordFor`/`ghostsOn`, which are rebuilt every
render and read the current filters. Its deps omitted `kinds`, so switching a kind off and hovering
would have tested emptiness against the **old** filter set — a peek opening on a day it had just
emptied.

### 5. The comment trap, twice, in locks I had just written

A bare `not.toContain` over a page whose prose now names `TODO_FACETS` and `facetCounts` — to
*explain their retirement* — is this repo's most-recorded false red, and I wrote it again in the
same pack. Both strip comments now. It also caught a real miss: `liveBoardCards` left as a dead
import, found by my own lock rather than by `tsc`, which does not flag unused imports here.

---

## FLAGS FOR NICK

**1. Deployed —** yes, and the acceptance re-run against the deployed site. See the top. Condition 4
had failed for most of the run and cleared when the noteboard session committed.

**2. Foot-margin parity — MATCHES, and it is now evidenced.**

| | `/queries` | `/todo` | `/todo/calendar` |
|---|---|---|---|
| chassis foot | **20px** | **20px** | **20px** |

Same `.ws-main` padding on all three; the chassis pack's addendum is measured rather than assumed,
and it still reads 20px at 1000/1440/1920 after everything this pack changed. **Two wrong readings
came first and both looked like answers** — a lowest-painted-box walk reported *1959px* on
`/queries*, a true measurement of an inner pane's scroll extent; scrolling to the bottom first
changed nothing, because **all three pages FILL** (probed: the only page-level scroller on any of
them is the sidebar `nav.ws-nav`).

**A side-finding I did not touch:** on `/queries` and `/todo` some inner boxes extend *past* the
window's bottom (892.75 and 897.3 against a window ending at 880). They are clipped so no pixels
escape, but the boxes sit outside their frame. For whichever session owns those pages.

**3. Upcoming-mode geometry — MONTH-BOUNDED, and the inventory chose it.** The machinery is
`monthGridDays` → `monthLabel` → `sameMonth`; a month-bounded range keeps **all three untouched**,
because what is shown stays a subset of the anchor's own month. A rolling five weeks spans two, so
it needs a second labelling rule for a title naming two months **and** a second dimming rule, since
`sameMonth` would dim a third of the grid as "not this month" when those days are exactly what the
mode exists to show. Two new rules against none.
Whole weeks are preserved (a week goes only when *all* of it is behind today), so the first row
keeps its pre-today days under their own `.lead` class — **not `.off`, which means "another month"
and would state something untrue about the date**. A past month yields nothing and the page says
so, rather than clamping to a week of finished days under a heading promising upcoming work.

**4. Carried types without a recoverable origin — NONE.** Every type has one: a writer's task from
`UserTask.dueDate`, a query card from `lastStatusChange ?? dateSent`, and housekeeping never reaches
the calendar at all. So no type renders live-only, and the "if an origin is unavailable, flag it"
branch is unexercised — though the code and a test cover it, since absence must not invent a mark.

**5. True overlay parity — what it would take.** Not begun, as instructed.

The To-do page's right-hand pane is **`TaskPane` + `TaskPaneBody`**, fed by **`buildJourney`** — a
different component from the `FocusFlow` the calendar opens. `TaskPane` takes a *built journey*, not
a card, and the `JourneyInputs` are gathered by `ToDoPage` at **:936** ("THE PORTED PANE'S INPUTS,
GATHERED ONCE"). So parity means extracting that gathering into something both pages call.

*Estimate: a day's work, and it needs the To-do session's cooperation because the extraction lands
in their file.* Files touched: `ToDoPage.tsx` (the gathering moves out), a new shared module beside
`buildJourney`, `TodoCalendarPage.tsx` (mount `TaskPane` instead of `FocusFlow`), and the locks that
currently assert the calendar opens `FocusFlow`. **The risk is not the extraction but the seam**:
`ToDoPage` gathers from hooks it holds, so the shared function either takes ~8 arguments or a new
context provider appears — and that is a shape decision, not an overnight one.

**What was done instead, and what it cost:** only the WIDTH is scoped. `FocusFlow` was already
`role="dialog" aria-modal="true"` over a fixed scrim, already centred, already scrolling in its own
body, already closing on Escape. Rebuilding any of that would have replaced a working implementation
with a second one. Measured: **430px, centred, on screen, `dialog`/`true`, body `overflow-y: auto`,
Escape closes with the day still selected.**

**6. Outside the pill vocabulary — one thing, and it is now closed.** `offer_received` had no card
row and fell through to its own label; your ruling `Decide on offer` landed with Phase 4, and the
coverage lock now asserts a **complete** table rather than enumerating an exception. It is not
"Accept offer" — the app does not presume the answer.
Nothing else fell outside. Done items carry no `taskType`, so they are filed by label, and **an item
no kind claims is KEPT, never dropped**: a filter that silently swallows what it does not recognise
reports a quieter month than the writer has, which is the one direction this must not fail in.

**7. Cushion after this pack — 13 / 4 / 4 at 1000 / 1440 / 1920.** Identical to Step 0. No
`data-fold-short` at any width, in either mode, filtered or not.

**8. Cross-session.** The noteboard session arrived in `src/components/todo/` **after** my Step 0
gate and worked through most of the run — `db.tsx`, `types.ts`, `TodoNoteboardPage.tsx` and two
untracked test files. No overlap with anything I touched, so I continued and recorded it. Their
in-flight state produced up to 16 whole-tree test failures and 10 `tsc` errors at various moments;
**every one was attributed by reading the failing assertion, not by file ownership** — four of those
suites read my files too, so ownership would have been the wrong test. All cleared when they
committed, which is also what unblocked the deploy.

`tasksViewport.test.tsx` is outside my territory and this session has now edited it **twice** — the
`rows = 6` lock in Phase 3 and the facet block in Phase 4. Both carry their flag in the file.

---

## What could NOT be verified — stated plainly

**Pointer interaction *inside* `FocusFlow` remains unverifiable in this harness.** This is the
standing gap, re-measured: `elementsFromPoint` over the sheet's own footer button returns
`["body","html"]`, the sheet receives no click events, and neither the × nor a scrim click does
anything — while the scrim measures `position: fixed`, `visibility: visible`, `pointer-events:
auto`, `z-index: 50`, `0,0,1440×900`, and **the sheet paints correctly**
(`reports/calendar-finishing/overlay-1440.png`).

> **A harness that cannot click into an overlay and an app whose overlay cannot be clicked produce
> the identical measurement.** Neither is asserted. What IS established: the overlay opens from a
> panel row, its geometry is right, and **Escape closes it with the day still selected** — keyboard
> reaches it even though the synthetic pointer does not, which is itself evidence the component is
> alive and listening.

**Consequently: completing a carried item was NOT performed, and Undo remains unverified
end-to-end.** Completing is a real write to the dev harness account whose only reversal is the
toast's Undo — the very thing the gap leaves unproven. Making a write I could not reliably reverse
unattended, in order to prove a claim about reversal, was the wrong trade.

**One decision learned while probing it, worth keeping:** `FocusFlow` mounts `useOverlay` with
`onScrimClick: () => { if (!reduce) setNudged(true) }` — **a scrim click NUDGES the sheet rather
than closing it**, deliberately, because it can hold staged answers a stray click would discard. The
pack asked for "escape and scrim-click close"; the app's own recorded decision is escape-and-×, and
a recorded decision is not overturned by a pack. Flagged, not changed.

---

## The supersession, recorded as the pack requires

**The ruling that "the calendar uses `TODO_FACETS` as the single shared vocabulary" is superseded,
on this page only.** It was right when the calendar was a projection of TASKS: the same four buckets
the board and the sidebar badge read, narrowing the same live cards. **The record layer changed what
the page is.** It shows EVENTS now — things that happened, in both directions, most of which are not
tasks and never were — and *"Urgent"* has no meaning applied to a query sent three weeks ago.

`TODO_FACETS` is **untouched**: the board keeps it, the sidebar badge keeps it, and the calendar's
control is calendar-local. The supersession is recorded at `CAL_KINDS`, at the control itself, in
three retargeted locks, and here — each citing this pack.
