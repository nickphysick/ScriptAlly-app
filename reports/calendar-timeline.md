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
