# Calendar rebuild — Step 0 recon

**Session:** `calendar` · **Date:** 19 Aug 2026 (overnight, unattended)
**Outcome: RED GATE TRIPPED AT STEP 0. No code written. Phases 1–6 not started.**

---

## The gate, and why it is the right call

The prompt states: *"Red gate — stop the run and report only, do not proceed to Phase 1, if:
`CalendarView.tsx` is absent or renamed."*

**`CalendarView.tsx` is absent.** It was deleted on **9 July 2026** in commit `e3543e9d`
("chore: remove the dead full-calendar view"), a month before this run, by a session that
verified it was unreachable:

> CalendarView (the outdated full-query-calendar modal, ~1199 lines) was rendered behind
> `isFullCalendarOpen`, but nothing ever set it true — unreachable dead code. Removed the
> component file, its import + render site + state in `Dashboard.tsx`, and the now-unused
> Calendar icon import.

Evidence: `git log --diff-filter=D -- "*CalendarView*"` → `e3543e9d`; `git ls-files | grep -i
calendarview` → empty; `find . -iname "*CalendarView*"` → empty. It is not renamed — nothing in
`src/` references the identifier.

I stopped here as instructed. The rest of this document is the read-only recon, which turned out
to matter more than the gate itself — because the gate is not the only stale premise in the brief.

### The finding that actually matters

**The Calendar page already exists, is live, is real, and is already a month grid.** It is
`src/components/todo/TodoCalendarPage.tsx` (294 lines), routed at `src/App.tsx:697`:

```tsx
{/* tasks-pages P3: the Calendar is REAL — the placeholder era ends here. */}
<StagePage active={routeKey === "todo" && todoPage === "calendar"} layout="fillColumn" clip>
  <TodoCalendarPage onNavigate={handleNavigate} onNavigatePath={(p) => navigate(p)} />
</StagePage>
```

`CalendarView` was never the calendar page. It was a dead modal on the Dashboard. The brief
appears to have been written against a memory of that file rather than against the router — the
hazard CLAUDE.md already names: *"THE SHELL RENDERS WHAT EXISTS, NEVER WHAT IS PLANNED… any nav
list in a pack is a PROPOSAL to be checked against the router, not a specification."*

**And it is not my territory.** `TodoCalendarPage.tsx` lives in `src/components/todo/`, alongside
`todoCalendar.css`, and imports twelve To-do modules. My scope fence assigns the To-do list
session *"the To-do list page, its board CSS, `useTodoToast`, `snoozeCard`, and any task
derivation, store, or hook they read."* The Calendar consumes `useTodoToast`, `assembleBoardColumns`,
`TODO_FACETS`, `todoFamily`, `todoTags`, `TasksPageLayout` and `FocusFlow`. Rebuilding it tonight
would have meant rewriting a live page in the middle of another session's working set, on the
same night that session is refactoring the derivation underneath it.

Had the gate not been there, this run would have caused real damage. It was.

---

## Step 0 answers

### 1. Task derivation

**Where:** a pure library layer, not inlined — `src/lib/todoColumns.ts:349`,
`assembleBoardColumns(input)` → `{ board, hkGroups, cols }`.

**The Calendar already consumes it, identically to the board** (`TodoCalendarPage.tsx:85-95`):

```tsx
const assembled = useMemo(
  () => assembleBoardColumns({
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now,
    mutedTaskRules: currentUser?.mutedTaskRules,
  }), [...]);
```

**Inputs read:** `tasks`, `userTasks`, `queries`, `agents`, `manuscripts`, `taskFlags`,
`activities`, `today`, `now`, `currentUser.mutedTaskRules` — all from `useScriptAllyDb()`.

**Outputs:** `cols` = `{ todo, today, snoozed, done }` of `BoardCard`; `board` (the assembled
board incl. housekeeping); `hkGroups` (grouped housekeeping).

**The calendar's own pure layer** is `src/lib/todoCalendar.ts` (249 lines, unit-tested in
`src/lib/todoCalendar.test.ts`): `calendarDays()`, `monthGridDays()`, `weekDays()`,
`monthLabel()`, `weekLabel()`, `shiftMonth()`, `shiftWeek()`, `sameMonth()`, `cardActionYmd()`,
`calFoldCap()`, `CAL_CELL_CAP`. Output item shape (`todoCalendar.ts:36`):

```ts
export interface CalendarItem {
  key: string; ymd: string; label: string;
  family: "agent" | "task" | "snoozed" | "done";
  card?: BoardCard;   // live items only — the pip opens the sheet on it
  struck?: boolean;
}
```

> **Flag 1 / Flag 6 answered together:** the shared derivation the brief asks me to *"flag as
> required follow-up work"* **already exists and is already shared**. A `useTaskFeed` extraction
> costs nothing because it has effectively been done — `assembleBoardColumns` is the feed, and the
> board, the sidebar badge, the Today list and the Calendar all read it. `CalendarView` is not
> duplicating To-do logic, because `CalendarView` does not exist; `TodoCalendarPage` duplicates
> none of it either. Its head comment states the invariant explicitly:
> *"THE PAGE IS A PROJECTION OF THE SAME DERIVATION EVERY TASKS SURFACE READS — one
> `assembleBoardColumns`, its cards placed on their action dates by the pure `todoCalendar` layer."*

### 2. Snooze / dismiss

`src/lib/db.tsx:314` —
```ts
dismissTask: (taskType: string, relatedRecordId: string,
              dismissType: "permanent" | "fixed snooze" | "custom date",
              snoozeDays?: number) => Promise<void>;
```
`src/lib/db.tsx:200` —
```ts
upsertTaskFlag: (key: TaskFlagKey, patch: { snoozedUntil?: string | null;
  committedDate?: string | null; skippedAt?: string | null; resolvedAt?: string | null;
  bumpSnooze?: boolean; unbumpSnooze?: boolean }) => Promise<void>;
```

**State:** the `taskFlags` collection. `dismissTask` (`db.tsx:2613`) resolves to
`upsertTaskFlag(key, { snoozedUntil, bumpSnooze: true })` at `db.tsx:2657`; permanent dismissal
writes the `MUTED_UNTIL` sentinel.

**Yes, the return date is readable from another page** — `TaskFlag.snoozedUntil` (ISO). The
predicates are pure and shared: `flagSleeps(flag, nowMs)` (`taskFlags.ts:60`) and
`flagReturnedToday(flag, nowMs)` (`taskFlags.ts:68`). The Calendar already places a snoozed item
on its return date via the `snoozed` family.

### 3. User-created tasks — **yes, with due dates, already wired**

`src/types.ts:615` `UserTask` — `id, userId, text, detail?, done, completedAt?, createdAt,
updatedAt, queryId?, agentId?, manuscriptId?, surfaceOffset?, tags?, estimateMin?,
**dueDate?**, committedDate?`.

`src/types.ts:642` with its law stated in place:
> *"`dueDate` — The day a reminder resurfaces — ISO date, NO time ("YYYY-MM-DD"). … unset = a
> plain to-do; set = surfaces (and renders overdue) on that day. Dates are INPUT, not derived
> state — nothing auto-fires; a due date only surfaces, never writes."*

Completion flag: `done: boolean` + `completedAt?: string`. Writer:
`updateUserTask(id, fields)` (`db.tsx:297`, impl `db.tsx:2403`) which accepts
`dueDate: string | null`.

> **Flag 3 answered:** the schema decision is **not** open. User-created tasks with due dates
> exist, are validated, and are already on the calendar. Phase 6's `TODO(nick)` fallback is moot.

### 4. Action components — **all callable from an arbitrary page**

The To-do surfaces do **not** invoke `MarkSentPopover` / `RecordResponseModal` directly. They open
**one** journey chrome: `src/components/todo/FocusFlow.tsx`, props (`FocusFlow.tsx:129`):

```ts
export interface FocusFlowProps {
  items: FocusItem[];
  onClose: () => void;
  onNavigate: (tab, subPageName?, opts?: { agentId?; manuscriptId? }) => void;
  onToast: (msg: string, action?: { label: string; fn: () => void }) => void;
  prefill?: { sentDate?: string; method?: string; materials?: string[] };
  mode?: "journey" | "sweep" | "weeklyReview";
  ritual?: boolean;
}
```

It reaches every action itself through `useScriptAllyDb()` (`FocusFlow.tsx:147-149`):
`recordMaterialsSent`, `logNudge`, `recordOfferDecision`, `dismissTask`, `upsertTaskFlag`,
`updateQueryStatus`, `undoQueryStatus`, `resolveTaskFlag`, `deleteActivity`, `addUserTask`,
`updateUserTask`, `updateAgent`, `updateUserProfile`.

**It is not coupled to Query Centre local state.** No decoupling work is required.

| Action | Route |
|---|---|
| send partial / full / R&R | `FocusFlow` → `cardJourney` / `isSendTask` → `recordMaterialsSent` |
| log a nudge | `FocusFlow` → `nudgeDraft` + `logNudge` (`NUDGE_NESTED_TYPE`) |
| record a response | `FocusFlow` → `updateQueryStatus` / `recordOfferDecision` |

**The Calendar already opens it** — `TodoCalendarPage.tsx:130` `openSheet()` sets `flowCard`, and
the page renders `<FocusFlow items={[{ kind: "card", card: flowCard }]} … />`.

> **Flag 2 answered:** nothing needs decoupling. Phase 5's fallback (route-through to the reading
> pane) is unnecessary; the correct launcher already exists and is already used.

### 5. Existing calendar — what it derives, and what it duplicates

Duplicates **nothing**. `TodoCalendarPage.tsx` derives:
- `assembled` — the shared `assembleBoardColumns` (above);
- `byDay` — `calendarDays()` over facet- and tag-narrowed columns (`:100-118`);
- `facetTotals` — `facetCounts(liveBoardCards(assembled.cols))` (`:122`), with its own note:
  *"the same `facetCounts` over the same `liveBoardCards` the sidebar fed, so the Calendar's
  control cannot state a different number from the board's for the same facet."*
- `cellCap` — `calFoldCap(rowPx)`, measured live by a `ResizeObserver` (`:66-81`).

Colours come from **one** module: `CAL_PIP` / `CAL_LEGEND` in `src/lib/todoFamily.ts`, and the
legend *renders from the map* rather than restating it (`:238`).

### 6. `responseDeadline` vs `writerExpectedDate` — **both are live, deliberately**

The brief's premise ("the derived-status work replaced the single `responseDeadline` field") is
half right. `writerExpectedDate` was added; `responseDeadline` was **not** removed — it is still
read in ~20 files including `Dashboard.tsx`, `Queries.tsx`, `OverToYou.tsx`, `fortnightEvents.ts`,
`dashboardStats.ts`, `FocusFlow.tsx`, `ToDoPage.tsx`.

The arbiter is `src/lib/expectedDate.ts`, whose head states the model:

> *"TWO FACTS, TWO SHAPES, AND NEITHER OF THEM IS A FLAG. the agency's window → DERIVED AT READ
> TIME from their current stated weeks; the writer's date → STORED, in its own field, written only
> by the writer's control."*

- `WRITER_EXPECTED_FIELD = "writerExpectedDate"` (`:35`) — stored, writer-owned. Written by
  `MarkSentPopover.tsx:129` and `saveQueryEdits.ts:173`.
- `WRITER_EXPECTED_SET_AT_FIELD = "writerExpectedSetAt"` (`:55`) — when they said so.
- `agentWindowMs(sentMs, weeks)` (`:104`) — the agency's window, derived, never stored.
- **`resolveExpectedDate()` (`:161`) → `ResolvedExpected` with `ExpectedSource = "writer" |
  "agent" | "reply" | null`** — this is what a new surface should call. Do not read either raw
  field directly.

Note `expectedDate.ts:28`: the field is deliberately **not** in `src/types.ts` (another stream's
file) and is reached through one local cast.

---

## Baseline gates (recorded before any edit; no edits made)

`git rev-parse --abbrev-ref HEAD` = `main`; `git rev-list --count HEAD..main` = **0** (level).
HEAD = `7ee240c6`.

- **tsc: 22 errors.** All in other sessions' WIP — `src/components/AccountSettings.tsx` (10:
  `SECTION_BANDS`, `MountPanel`, `CardShell` unresolved; `title` prop mismatches),
  `src/components/settings/sectionBands.tsx:38` (missing `tasks` key),
  `tests/e2e/pkgRestructure.measure.ts` (6: `unknown` property access).
  **Zero in any calendar-owned file.** This is the Account settings and Submission packages
  sessions mid-edit, exactly as the brief predicted — not a red build.
- **Vitest: 1 failed file, 2 failed tests, 5610 passed, 2 skipped (331 files).** The failure is
  `src/components/todo/tasksViewport.test.tsx:418` — and it is a **cross-session collision worth
  your attention**. It slices `AccountSettings.tsx` on the anchor `const tasksSection`, which the
  Account settings session has evidently just renamed or removed:
  ```
  const sec = acct.slice(acct.indexOf("const tasksSection"));
  expect(acct.indexOf("const tasksSection")).toBeGreaterThan(-1);
  ```
  This is precisely the bounded-slice hazard CLAUDE.md documents (*"`indexOf` returns `-1` … the
  lock does not go red, it goes vague"*) — here it went red only because a later assertion
  happens to check the anchor. A To-do-owned lock, broken by the Account settings session, over a
  file neither of them owns. **Not mine to fix; not fixed.**
- **Suite size moved under me mid-run:** two runs twenty minutes apart reported **5581** then
  **5614** tests (3 failed files then 1). Another session committed between them. Recorded per
  CLAUDE.md's *"record the suite figure fresh at commit time; never copy it from an earlier note."*
- **vite build:** not run — no code was written, so there is nothing of mine for it to verify.

---

## Flags for Nick

**1. Is the To-do derivation extractable, and what would a shared `useTaskFeed` cost?**
Already extracted. `assembleBoardColumns` (`src/lib/todoColumns.ts:349`) *is* the shared feed —
board, sidebar badge, Today list and Calendar all read it, and the Calendar's counts are the
board's counts by construction. Cost of a further `useTaskFeed`: **nothing to gain.** I'd leave it.

**2. Which action components need decoupling?**
None. `FocusFlow` is callable from anywhere, takes `items/onClose/onNavigate/onToast`, and reaches
every write through `useScriptAllyDb()`. The Calendar already uses it.

**3. Do user-created tasks with due dates exist?**
Yes — `UserTask.dueDate` (`types.ts:642`), written via `updateUserTask`, already rendered on the
calendar. Not an open schema decision.

**4. Does the correction UI exist for EDIT THIS ENTRY?**
Yes. `src/components/reading-pane/TimelineComposer.tsx:230` calls
`editActivity(query.id, editing.activityId, { date, description: note })` — *"correct an existing
entry in place (editActivity patches date + note; never a new record)"*. Covered by
`src/lib/queryCentreCorrections.test.ts`. So Phase 4's disabled-button fallback was not needed.

**5. What in the design ref could not be implemented faithfully?**
Nothing was attempted (red gate). But the recon surfaced that **six of the brief's requirements
would revert decisions currently locked in code**, and you should rule on each before anyone
builds this. I have not resolved any of them.

| Brief asks for | What is built, and why |
|---|---|
| `grid-auto-rows: 108px`, rigid cells, **max 3 chips** | `calFoldCap(rowPx)` — the fold is **measured** by `ResizeObserver` (`TodoCalendarPage.tsx:66-81`), *"so a short laptop folds sooner rather than shearing a pip in half"* (tasks-viewport P3). `CAL_CELL_CAP = 3` survives only as the pre-measure fallback. A rigid 108px reverts that pack. |
| A **Notes** filter chip + Notes section, pale sage | Notes are **structurally retired** from the calendar: *"a dated user card IS a task (two-natures), so the old butter 'dated notes' family was structurally empty and is RETIRED (tasks-audit P4)"* (`todoCalendar.ts:16`). A Notes chip would filter an empty family. |
| Five chips: Agent events / Expected / Your tasks / Notes / Completed, **replacing the legend** | `TODO_FACETS` — four facets from **one** definition shared with board, sidebar and badge, *"so the two pages' filters are one control with two vocabularies rather than two controls."* The legend renders **from** `CAL_PIP`. A new five-chip vocabulary creates the second control that note was written to prevent. |
| A composer **docked in the day panel** | *"the ONE composer lives on the To-do list page — go there and announce, the bar's ＋ New pattern (never a second create surface)"* (`TodoCalendarPage.tsx:189`). Today the button navigates to `/todo` and dispatches `TODO_OPEN_COMPOSER`. |
| Phase 5 launchers into `MarkSentPopover` / `RecordResponseModal` | `FocusFlow` is the single journey chrome for every To-do entrance. Wiring the calendar to the popovers directly would be a second action surface — the exact failure Phase 5 says it exists to prevent. |
| `MountPanel`, not `MountCard` | Neither. The Tasks pages share `TasksPageLayout` (`TplGrow`, `TplZone`). Swapping in `MountPanel` forks the Tasks chassis. |

Two brief items are genuinely absent and would be small, real work: **the Week view still exists**
(`view: "month" | "week"`) and could be deleted as asked; there is **no List view** to delete.

**6. Was `CalendarView` duplicating To-do logic?**
No — it has not existed since 9 July. Nothing in the tree duplicates the derivation.

**7. Cross-session collisions**

- **Files I needed but could not touch:** all of them. The entire live calendar
  (`TodoCalendarPage.tsx`, `todoCalendar.css`, `todoCalendar.ts`, `todoFamily.ts`,
  `recordingCalendar.ts`, `RecordingCalendar.tsx`) sits in the To-do session's territory. My
  brief granted me `CalendarView.tsx`, which does not exist — so this session was allocated an
  **empty territory**. That is the single thing to fix before re-running it.
- **Nothing changed under me in calendar-adjacent source.** `git status --porcelain
  src/components/todo/ src/lib/todoCalendar.ts src/lib/todoFamily.ts` was clean at recon time, and
  both readings of every file quoted here were identical. **But the tree did move:** the suite grew
  from 5581 to 5614 tests during the run, and `tasksViewport.test.tsx` broke against
  `AccountSettings.tsx` (see baseline). Two sessions are already colliding on that anchor tonight.
- **Locked components needing props they lack:** none encountered.
- **Global tokens wanted:** none — no styling written.
- **Other sessions' baseline errors:** listed above; left untouched.

---

## Recommendation (yours to accept or reject)

Re-issue this pack with `TodoCalendarPage.tsx` as the named territory, negotiated with the To-do
session — the two pages share `assembleBoardColumns`, `TODO_FACETS`, `todoFamily`, `useTodoToast`
and `FocusFlow`, so they cannot be owned by two unattended sessions on the same night. Then rule
on the six table rows above **before** the run starts, because each is a locked decision with its
reasoning recorded in the file it lives in, and an unattended session should not be overturning
any of them on the strength of a mockup.

*No files were modified. This report is the only artefact, committed alone.*
