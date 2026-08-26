# Calendar — the week timeline

Rolling week timeline replacing the month grid. Rows are agent relationships, columns are the
seven days from today. Nothing below the view layer changes.

---

## Phase 0 — recon (read-only)

Ran against `main` at `638af4ee`, worktree level with `main` (`git rev-list --count HEAD..main` = 0).

### Red gate — clear

* **No other session is in this territory.** Five worktrees exist (`ScriptAlly-app`,
  `scriptally-analytics`, `ScriptAlly-masthead`, `ScriptAlly-pkgband`, `ScriptAlly-ptr`); none has
  a modified file matching `calendar|todoCal|calLook`.
* **`recordDays` and the dedupe are structurally intact.** `src/lib/todoCalendar.ts` last changed
  on 22 Aug (`bd10cb66`, the expected-dates pack), which added `expectedDays` beside them and
  touched neither.
* **`useTaskPaneSession` was committed to today** (`8861a7c6`, journeys Phase 7 — "the filling
  primary") but additively: the signature `(card, host, idPrefix)` and the `{ journey, onPrimary }`
  the calendar reads are unchanged. Not a material restructure.

### 1 · What in `todoCalendar.ts` is view-shaped, and what is data-shaped

**View-shaped — in scope, retires or is superseded with the month grid.**

| Symbol | What it is |
|---|---|
| `monthGridDays` | the 35/42-cell Monday-start month, never a torn row |
| `monthLabel` · `shiftMonth` · `sameMonth` | the month-anchor vocabulary (title, pager, `.off` dimming) |
| `CalMode` · `upcomingGridDays` | the month-bounded "Upcoming only" range |
| `CAL_CELL_CAP` · `CAL_CELL_FLOOR` · `CAL_PIP_H` · `CAL_CELL_CHROME` · `CAL_MORE_H` | the fold's constants |
| `FoldMetrics` · `FOLD_FALLBACK` · `FoldResult` · `foldFor` · `calFoldCap` · `calFoldCapFolded` · `foldMetricsFrom` | the fold |
| `CellSlots` · `cellSlots` | the cell's slot arithmetic — live work first, record second, counter takes a slot |
| `PEEK_DELAY_MS` · `PEEK_SCALE` · `PEEK_OPACITY` · `PEEK_PAD` · `PEEK_LIFT` · `PeekRect` · `peekBox` | the hover peek, which exists to answer `+N MORE` |
| `CalKind` · `CalKindRule` · `CAL_KINDS` · `CAL_KIND_ORDER` · `allKinds` · `itemKind` · `recordKind` · `itemInKinds` · `recordInKinds` · `expectedInKinds` | the event-kind filters — a *different* vocabulary from the timeline's five (your turn · waiting · on the record · your tasks · carried), so superseded rather than transferred |

**Data-shaped — untouched, and every one of them transfers.**

`toYmd` · `daysSince` · `shortCalDate` · `CalFamily` · `CalendarItem` · `CalendarDayData` ·
`CalendarInput` · `cardActionYmd` · `calendarDays` · `RecordDir` · `RecordSpec` · `RECORD_TYPES` ·
`RECORD_STATUS` · `RecordItem` · `recordSpecFor` · `recordDays` · `exchangeLine` · `REC_TONE` ·
`REC_LEGEND` · `dedupeAgainstRecord` · `PILL_BY_TASK` · `PILL_SNOOZED` · `pillLabel` · `GhostItem` ·
`ghostsFor` · `carriedLine` · `draggableTask` · `ExpectedItem` · `expectedDays` · `EXPECTED_PILL` ·
`expectedLine`.

**The three placement functions take the visible day list as an argument** — `calendarDays(input,
visible)`, `recordDays(…, range)`, `expectedDays(…, visible, todayYmd)`. A week window is seven
strings where a month was thirty-five. **That is a change of caller, not of function**, which is
what makes "the data layer transfers" true rather than hopeful.

One consequence worth stating now: `calendarDays` places carried work on `input.today` regardless
of the window, so paging to a future week yields a `today` key the view does not read. Harmless,
and it is the existing behaviour — the month grid did the same for a month that did not contain
today.

### 2 · What keys off "a day cell", and what becomes of it

| Today | In a timeline |
|---|---|
| the hover peek — `armPeek`/`clearPeek`, `peekBox`, `.cal-peek`, portalled to `document.body` | **retires.** It exists to answer `+N MORE`; a chip is its own hover target and the workspace below is the reading surface |
| `+N MORE` — `cellSlots.overflow`, `.cal-more2` | **retires.** Nothing overflows: a row grows to hold its items |
| `data-fold-short` — `foldFor().shortfall` | **retires** with the floor it reports against |
| the day panel — `CalDayPanel`, `selDay`, `.cal-focus`, `.cal-fpbody` | **becomes the workspace region** (Phase 4). Selection stops being a *day* and becomes an *item* |
| the panel collapse — `panelOpen`, `.cal-nopanel`, `.cal-paneltab`, `togglePanel`, the scoped click-away | **retires.** The region fills on selection instead of standing open to be pushed away |
| the day's count chip — `.cal-c2` | **retires.** A row/day intersection is not a cell and has nothing to count |
| `.cal-cell.off` · `.lead` | **retire.** A seven-day window has no other-month days, and `Upcoming only` goes with the month |
| `.cal-cell.today` · `.past` | **survive as column tints** |
| `.cal-cell.sel` | **moves to the chip** — selection is an item, not a day |
| `.cal-cell.dropok` | **survives** as the day-column drop target for the drag |
| `focusCard(ymd, key)` · `focusKey` · `onFocused` — the pill-scrolls-its-panel-row effect | **becomes selection**, which needs no scroll-into-view |
| `selectDay` · `dayData` · `itemsFor` · `recordFor` · `expectedFor` · `ghostsOn` | **survive** as the per-day read the row derivation consumes |

**Nothing else depends on the fold** inside `src/`. Outside it, five Playwright measures read
`data-fold-short` or `cal-more2` — and **two are not calendar files**: `completionPathsPhase5.measure.ts`
and `packCPhase3.measure.ts`. Flagged, not edited.

`calFoldCap` and friends are also *searched for* by `railPeek.ts` / `workspaceShell.ts` greps only
because the rail has its own `PEEK_*` constants. Different symbols, no relationship.

### 3 · Where a row's identity comes from

**There is no per-agent grouping to reuse.** `agentList.groupAgents` partitions `Agent[]` on the
Agent-list page's own axes — a different question. So identity derives, in the view layer:

* agent cards — `BoardCard.agentId` (`todoBoard.ts:110`, added expressly as identity rather than
  presentation);
* record entries — `RecordItem.queryId` → `Query.agentId`. **`RecordItem` carries no `agentId`**,
  only the display strings, so the join happens in the new function and `recordDays` is untouched;
* expected dates — `ExpectedItem.queryId` → `Query.agentId`;
* completed-from-activity items — `CalendarItem.activityId` → `Activity.queryId` → `Query.agentId`;
* user tasks, and completed user tasks — no agent at all, so the pinned **Your tasks** row.

Name and agency come from `agentPrimary`/`agentSecondary`, which every agent-naming surface reads;
the dot is the real `StatusDot`.

### 4 · What supplies a waiting band's two ends

Both, with **no new read**, and both already imported by `todoCalendar.ts`.

* **Start** — the latest of `q.dateSent`, `q.partialSentDate`, `q.fullSentDate`. These are
  `recomputeQuery`'s own output from the activity feed, so this *is* the send activity, derived
  once and shared, rather than a second scan of `activities`. It is the anchor `expectedDays`
  already computes.
* **End** — `resolveExpectedDate(q, sentMs, agent?.responseTimeWeeks ?? null, null)`.

`timelineBands` calls the resolver directly rather than reusing `expectedDays`, which cannot serve:
it filters to visible-and-not-yet-passed and discards `sentMs`, and a band needs the pair and needs
passed windows.

**The band inherits a documented limit and must not paper over it.** The fourth argument is `null`
because the global feed carries no `replyWeeks` — an agent's stated window inside a holding reply
lives in the query's nested events, which only the reading pane loads. So a query whose latest
statement is a reply resolves from the agency's standing weeks or the writer's own date, exactly as
the To-do board resolves it. Composing a window from what this page holds would be inventing data.

### 5 · The pane mounts as it does today

Confirmed unchanged and carried over verbatim: `CAL_PANE_PREFIX = "cal-"` (:40) →
`useTaskPaneSession(paneCard, paneHost, CAL_PANE_PREFIX)` (:627) →
`<TaskPane journey={paneSession.journey} onPrimary={paneSession.onPrimary} />` (:1381), inside
`.cal-panewin` — `role="dialog" aria-modal="true"`, closed by Escape and the × only, **never by the
scrim**, because the pane holds answers the writer has typed.

---

## Findings

1. **The board needs no change to a shared file.** `TplZone` is the Tasks family's one scroll
   primitive and `TasksPageLayout` already declares `settleOn=".tpl-zone, .l-body, .cal-fpbody"`.
   The month *compresses* rather than scrolls, which is why the calendar has never used the
   primitive; a board that scrolls uses it, and the Type A settle keeps working with nothing
   edited. **`.cal-fpbody` in that list loses its subject** when the day panel becomes the
   workspace — a one-word cleanup in a file this session does not own, reported rather than made.

2. **The layout ref's media queries are in the wrong order.** `.two` is declared at `max-width:1500`,
   then `1080`, then **`1240` last** — so at ≤1080 the 1240 block wins on equal specificity and the
   workspace becomes a single 430px column instead of stacking at `1fr`. This repo has the law
   already (the marketing nav's `--mk-nav-h` lost 59px on every phone the same way). Narrow blocks
   go last here, and the brief's behaviour — stack at 1fr, Know two-up — is what ships.

3. **The ref gives every chip in a row the same `top`, and its sample never exercises the collision.**
   `.lane` is a zero-height strip spanning columns 2 to −1 with chips absolutely positioned at
   `top:-50px`; a non-band chip carries `max-width:calc((100−L)% − 10px)`, i.e. all the remaining
   width. Two items on nearby days in one row therefore overlap. The ref's own data never shows it,
   because the two `rec` chips that would collide with a band both fall on negative day indices and
   are clipped out by `if(b<0) return ''`. **Rows need lane packing** — as many lanes as the
   intervals require, row height following — which is Phase 2/3 work, not a ref detail.

4. **The baseline is red outside this territory, and it is moving.** `npx tsc --noEmit` fails only
   in `src/components/manuscripts/manuscriptPlate.test.tsx` (3 errors). The suite ran twice minutes
   apart and gave **7 failures in 1 file**, then **17 in 2** (`manuscriptPlate.test.tsx` +
   `manuscriptDossier.test.tsx`) — another session is editing that page live. Nothing calendar-shaped
   is red: `todoCalendar.test.ts` 197 passed, `recordingCalendar.test.ts` 12 passed. Recorded so
   "no worse than baseline" is measured against my own files, and re-checked before every phase.

5. **Pre-existing dirt in the tree, none of it mine and none of it touched:** modified
   `reports/calendar-fixes/month-{1440,1920}.png`, deleted `run-artifacts/finish-round.txt`,
   untracked `design-refs/173-package-attach (1).html`, `reports/account-settings/v5-contrast-deployed.png`,
   `run-artifacts/.thin-cases-restore.json`.

## Baseline, for comparison

| | |
|---|---|
| suite | 7,116 tests · 400 files green · **2 files red, both `src/components/manuscripts/`** |
| typecheck | red, `manuscriptPlate.test.tsx` only |
| owned suites | `todoCalendar.test.ts` 197 ✓ · `recordingCalendar.test.ts` 12 ✓ |

---

# Phases 1–5 — the run

**DEPLOYED to dev, and the acceptance was re-run against the deployed site: 8 of 8 green, clean
console.** https://scriptally-dev.web.app/todo/calendar

The deploy was built and pushed **from a throwaway worktree at my own HEAD**, not from the shared
checkout. Another session had uncommitted work in `src/` for the whole run — `ManuscriptDossier`,
`bookVersions`, `taskPane.css` and others — and a dev deploy builds from the working tree, so
deploying from here would have published their unfinished work under my name. The worktree is
removed and its copy of `.env.local` deleted.

Nothing is queued for prod. No rules changed; nothing outside hosting was touched.

## What landed

| | |
|---|---|
| Phase 1 | `design-refs/timeline-week-ref.html` · `design-refs/timeline-event-catalogue.html` |
| Phase 2 | `src/lib/todoTimeline.ts` + 46 tests — rows, bands, lanes, filters, sorts |
| Phase 3 | the board; the month grid, the fold, the peek, the day panel and the kind vocabulary retired |
| Phase 4 | selection, the focus band, and the three-column workspace |
| Phase 5 | `tests/e2e/calLook.measure.ts` rewritten as a rendered-page acceptance; 5 screenshots |

`TodoCalendarPage.tsx` 1,412 → 573 lines. `todoCalendar.css` 815 → 464. `todoCalendar.ts` 1,225 →
~790. Gates at every commit: `tsc` 0 errors, production build exit 0 with no CSS diagnostic, full
suite green.

## The acceptance, measured on the deployed site

At **1280 · 1440 · 1920 · 2400**, all with a clean console:

* **Seven columns fill.** Widths 104 / 126.86 / 195.43 / 264, spread ≤ 0.02px. `overflow-x: hidden`
  on the zone AND `document.scrollWidth === clientWidth` — the second is the one that would catch a
  board pushing the page wide, which the first cannot.
* **The board is inside the viewport** (bottom 879 against 900) — it scrolls internally, the page
  does not scroll.
* **Sticky chrome.** Day header `sticky` at `top: 0`; the pinned row `sticky` at 46px, compared
  against the **measured** header rather than either literal.
* **Nothing escapes.** 0 chips or bands outside their lane, 0 outside their row, at every width.
* **Bands clamp and mark** — every marked edge is within 4px of its lane's edge.
* **The count is a census, not a sample:** `16 rows · 22 items` reconciled against 16 rendered chips
  + 6 rendered bands. Switching *On the record* off gives `15 rows · 18 items` against 12 + 6.
* **The controls compose.** *Everything* ⊇ *Active only*; sorting reorders without changing the
  population (16 names, same set); search narrows to 0 and restores to 22.
* **Selecting writes nothing and moves nothing** — the ring lands on exactly one thing and every
  chip's text, position and width is identical before and after.
* **The workspace at 2400:** Do 430 · Read 870 · Know 300, 17 rows in the collapsed column with
  exactly 1 marked and 16 dimmed, **0 modal elements**, and the workspace's right edge on the
  split's right edge — no dead ground.
* **Escape returns to the week.**
* **`/todo` is unchanged** — its own title, its own scroller, 0 timeline classes in the visible page,
  and the Calendar's own board still mounted at zero height, which is the shell working.

Screenshots in `reports/calendar-timeline/`.

## The answers

### 1 · Deployed, and why
Above — first line.

### 2 · Which laws lost their subject
**Retired with a subject that no longer exists:**

* *a month never draws a torn row* · *a cell shows at least two occupants* · *the counter takes a
  slot* · *the fold divides by a measured pill* · *the peek is the answer to +N MORE* · *Upcoming
  only starts at today's week* · *the day panel groups by voice* · *the collapse is session-local* ·
  *the month name is the door* · *the cells are ruled, not boxed*. All recorded in
  `todoCalendar.test.ts`'s own retirement block rather than deleted in silence.
* **The fold's row divisor.** It existed to feed the fold. There is nothing left to divide.
* **The legend.** `CAL_PIP` and `CAL_LEGEND` now have **no production consumer**. Both are left
  untouched in `todoFamily.ts` — deleting a shared map on the strength of one page's redesign is not
  this session's call — and `tasksAuditLegend.test.tsx` keeps the half that is a claim about the two
  records rather than about a page.
* **`.cal-fpbody` in `TasksPageLayout`'s `settleOn`.** The day panel is gone. A one-word cleanup in
  a file I do not own; reported, not made.

**One law is CONTRADICTED rather than merely without a subject.** `"the week view is gone, and so
are the helpers that served it"` asserted this page had no week. It has one. The helpers it named
(`weekDays`/`weekLabel`/`shiftWeek`) are still gone and are not coming back: they served a week of
seven CELLS showing what the month already showed. The name collided; the subject never matched.

**Eleven assertions in six non-owned files** were retargeted rather than left red, each stating its
law: `todoPageSmoke`, `tasksAuditLegend`, `tasksTags`, `boardSidebar`, `tasksViewport`,
`tasksAuditBoundary`. One of those retargets makes a page **more** conformant, not less: the
Calendar was `tasksViewport`'s single stated exception — it answered the viewport lock by
*compressing* — and it now scrolls in the family's own primitive like every other Tasks page.

**Two e2e measures outside calendar territory still read `data-fold-short` and `.cal-more2`:**
`completionPathsPhase5.measure.ts` and `packCPhase3.measure.ts`. Their calendar sections have no
subject. Not edited — they belong to other packs. They are Playwright, so they are not in `npm test`
and CI is unaffected.

### 3 · Read and Know mounted the real components — no fallback
`TimelineRows` and `buildTimelineRows` from `src/components/reading-pane/QueryTimeline.tsx`, which
`FocusFlow.tsx:33` already mounts from the To-do world, so the precedent and the shape were both
established. The conversation reads the **authoritative per-query subcollection** through
`useDockActivity` — the store the Query Centre reads — not the global `activities` feed, which is a
best-effort projection twin and is how the dock came to say *"Nothing logged yet."* about a query
with history. Know composes from the query, the agent and the band's own `ExpectedItem`, so
`expectedLine` remains the single producer of that copy.

### 4 · From the catalogue: what I could not implement
* **The record chips' `OPEN QUERY`** is on the focus band rather than on the chip. Selecting is free
  and a chip is not a control panel; the band is where the actions live, which is the flow the
  catalogue's own §6 describes.
* **`GIVE IT A DATE`** on an undated task is not built, because undated tasks do not appear (open
  question 3's stated default).
* **`BRING IT FORWARD`** on a returning snoozed task is not built — the calendar passes no `snooze`
  host, deliberately and from before this pack: its snooze is *drag*.
* **Everything else in the catalogue is built**, including the three-state Show, the five kinds,
  the four sorts, drag-to-move, and the settle → evaporate → toast-with-Undo path.

### 5 · Rows at volume
The board's scrollport is **542px at every width** — vertical room does not vary with width — with
496px below the day header. On the harness account (16 agent rows + the pinned row):

| | |
|---|---|
| rows rendered | 17 |
| rows visible without scrolling | **6**, at all four widths |
| overflow | 539px |
| row heights | 45 (empty pinned) · 50 (one lane, head taller) · 72 (two lanes) · 99 (three lanes) |

**Six of seventeen at a 900px viewport is tight, and the chrome above the board is why** — masthead,
tool row and filter bar take 358px of a 900px viewport. Settling recovers 46px of that (masthead
103 → 57, measured) but hands it to the reclaim spacer rather than to the board, by design, so the
board neither gains nor loses room. That is the mechanism working; **do not fight it** — CLAUDE.md
records what happens when the reclaim is turned into scroller padding.

### 6 · What remains unverifiable
* **"A completion still raises one toast with Undo" is NOT verified on the page.** It needs a probe
  that presses a live primary, and the standing rule is that such a probe must act only on a card
  the harness itself created. Creating one means driving the To-do composer, which I judged too
  likely to leave junk on the account for the value. What I can say: the wiring is **byte-identical**
  to the version that was verified before this pack — same `useTaskCommit({ flash, rememberUndo:
  remember, confirmAsk, openFlow })`, same `useTodoToast`, same toast render, same `quickDone` handed
  to `FocusFlow`. The recipe for verifying it: create a dated user task on `/todo`, open it from the
  Your-tasks row, press the pane's primary, assert one toast carrying Undo, press Undo, assert the
  card returns — **and do not navigate before pressing Undo**, because the toast *is* the undo.
* **Bands were only ever exercised in the both-edges-clamped case.** Every one of the six on the
  harness account starts before the window and ends after it, so `openLeft`-only and
  `openRight`-only are covered by the unit tests and by no rendered pixel. A query sent *this week*
  would exercise them.
* **The scrollbar.** Measured 0px at every width — Chromium follows the macOS overlay setting and
  nothing overrides it. A classic-scrollbar question needs a console run in your own browser.
* **Single engine.** Chromium only.
* **Reduced motion** is not exercised.

### 7 · Cross-session observations
* **The baseline moved under me, twice, in both directions.** At Phase 0 `tsc` was red in
  `manuscriptPlate.test.tsx` and the suite gave 7 failures in one file, then 17 in two, minutes
  apart. By Phase 2 that session had fixed them and the tree was fully green. Test-file counts moved
  410 → 406 during Phase 5 as they removed files. Every figure in this report is stamped with the
  commit it was taken at.
* **Another session ran a production build in this checkout during my measurement window**, which
  overwrote `dist/` and `bundleGuard` correctly refused to measure. It cost one rebuild. The
  documented worktree split is the answer if this becomes frequent.
* **`src/components/todo/taskPane.css` was modified by another session** throughout. I did not touch
  it — which matters, because the pane fix I made is scoped from *this page's* stylesheet precisely
  so it does not reach into theirs.
* Pre-existing dirt untouched: `reports/calendar-fixes/*.png`, `run-artifacts/*`,
  `design-refs/173-package-attach (1).html`, `reports/account-settings/v5-contrast-deployed.png`.

## Three faults worth carrying forward

**1 · A token that DESCRIBES another element's height is wrong the moment it is written.**
`--tl-head-h: 36px` against a header that rendered 46. The pinned row stuck ten pixels too high and
would have slid under the day names — the exact fault a token exists to prevent, committed by the
token. The fix is not a better number: the header takes its height **from** the token now, so the
two cannot disagree, and the check compares the rendered header against the pinned row's offset
rather than against either literal.

**2 · Every number can pass while the page is unreadable.** The acceptance said the pane was 430px
wide at all four widths, which was exactly the specification. The screenshot showed the fork's
answers rendering **one word per line**. `.tpn .ws` is an unconditional two-column grid —
`minmax(0, 1fr) 288px`, no container query, no media query — so under about 600px the steps column
is whatever is left. **It is older than this pack:** the month's 440px modal window had the same
squeeze and shipped with it. Folded here at 0-3-0, `.cal-flow`'s precedent applied to the same
component. *A phase that renders no image ships this class of fault.*

**3 · I hit the first-match / wrong-subject family four times in one run, and three of them were my
own instruments.**
* A grouped CSS selector whose text contained another's — `.tl, .tl-head, .tl-row {` above
  `.tl-head, .tl-row {` — made a lock's `indexOf` slice a two-property stub and report that the
  board declared no columns. **Fixed at source:** one class owns the grid, so there is no substring
  left to collide with.
* A band's edge measured against the **zone** rather than its **lane**, so a 4px inset read as 214.
* *"Nothing is written"* asserted as byte-identical markup, red by the four characters of the `sel`
  class it had just asked for. The honest claim is the census and the geometry — and it is stronger.
* The `/todo` probe queried **document-wide** under a shell that keeps every page mounted, reported
  *"Query Centre"* while standing on `/todo`, and counted 35 timeline elements belonging to the
  Calendar's own hidden copy.

Each answered a question I did not ask, in the format of the one I did.

## Still open — for Nick, after testing on dev

Built to the stated default in every case; none resolved here.

1. **A fully-passed band in a past week — faded, or gone?** Built: **stays**, drawn faded, with no
   expiry pill and no expiry copy.
2. **Can an offer decision be snoozed?** Built: **yes** — the pane's own snooze, unchanged.
3. **Undated tasks reachable from the timeline?** Built: **not shown**.
4. **Does a closed row linger a week?** Built: **it lingers** while it holds anything in the window;
   with nothing in view it appears only under *Everything*.
5. **Does the collapsed column pin to today or follow the day you selected from?** Built:
   **follows**.
6. **Does a month view survive as a far-horizon view?** Built: **no month view.** The month grid's
   maths is recoverable from the commit before Phase 3 if you want it back.

One more, not on the list but now visible: **six of seventeen rows at 900px.** The board is honest
about it — it scrolls, with the day header and Your-tasks pinned — but if a week should show more
at a laptop height, the room has to come from the chrome above it, not from the rows.
