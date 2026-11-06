# To-do list v51 — the task workspace, ported onto the dev line (6 Nov)

Ref: `design-refs/todo-list-v50/todo-list-v50.html`. Branch `todo-list-v51`, worktree `../ScriptAlly-td51`. **Not merged,
not pushed, not deployed.**

## 1. The draft kept on main's tree

- Branch **`todo-list-v50-draft`**, commit **`fb8d2211e`**, cut from `main` @ `7e0e9aeec` in the primary checkout. 79 files:
  the `ws/` workspace (8 files), `lib/todoWs` (+ test), `lib/queryActions/deskSaves`, `AgentProfileSections`, the two
  drawings, the design ref, the v50 report and screenshots, `todoWs.measure.ts`, `RETIRED-todo-list-v50.md`; the edits to
  `CLAUDE.md`, `firestore.rules`, the rules tests, `types.ts`, `db.tsx`, `shortcuts.ts`, `AgentPanel.tsx`, the three
  journeys, `TodoRoute.tsx` and three unit tests; and main's v5 page deleted (30 files).
- The primary checkout is back on `main` @ `7e0e9aeec`, untouched. Its remaining dirt is other sessions' (the `reports/`
  screenshots and readings, the `run-artifacts/` deletions, `RUN-ORDER.md`, `prompts/`, five `design-refs/` folders) and
  was left exactly as it was. The draft is a reference only and is never merged.

## 2. The base

- Dev served **`index-gBdGm9sz.js`**. Rebuilt `dev/…-pk42-qc1521-sr1` @ **`7c6c90d2c`** (Sidebar rail v1's report) with
  `build:dev`: the same hash. `todo-list-v51` is cut from that commit.
- ⚠️ `query-centre-v152-1` has six commits newer than the base (`c6eff536a` … `222b8d7b4`, the QC session's overnight
  work). They are not on this branch, and whoever stacks the next dev deploy needs both.

## 3. What v7 and v12 had, and what became of it

| The tray had | Now |
|---|---|
| The arrival keys `sa.todoCompose` (shell, Corkboard) and `sa.todoOpenTask` (Corkboard's task card) | **Kept.** They now wait for the board before being read: the draft read them once, possibly before the tasks arrived, and lost the task. |
| `TODO_OPEN_COMPOSER` (the shell's "+ Task" while already on `/todo`) | **Kept, and newly heard.** The v5/v12 tray never listened for it; only the unmounted `ToDoPage` did, so the button did nothing on the desktop `/todo`. |
| Tag management (`TagsPane`, from the tray's Tags button) | **Kept**: Filters → "Manage your tags" opens the same pane. It was the only way in on the desktop. |
| The snooze/dismiss pop-up the phone also opens (`SetAsidePop`) | **Kept for the phone**: moved to `components/todo/SetAsidePop.tsx` with `MonthCal.tsx` and `setAsidePop.css` (see §5). |
| The phone badge's counting chain (`lib/trayCalendar`, `lib/trayRows`, `lib/todoTray`) | **Kept**: the phone and `lib/todoDueTally` read them. |
| j/k, `/`, `s`, `d`, `n` | **Kept** (the workspace binds them). |
| `e`/Enter "act on the desk" (`todoAct`) | **Dropped**: the workspace's desk acts through its own buttons. |
| The pin (`sa.pinList.todo`, `F`) | **Flagged, dropped.** The mockup has no pin. `PinPage` lost `"todo"` and the registry lost `todoPin`, so the shortcut sheet doesn't list a key that does nothing. |
| Needs you now (the carousel, v12) | **Flagged, dropped.** The header's priority line and the "Agents are waiting" group do that job in the mockup. |
| The calendar drawer (`TrayCalDrawer`, read-only month) | **Flagged, dropped.** Nothing in the mockup draws a calendar of tasks. |
| The date menu ("Pick a date", v7) | **Covered**: Snooze → Pick a date, and an own task's due menu. |
| Bulk close (Gone quiet: select, "Close n queries") | **Flagged, dropped.** The mockup closes one at a time. `saveClose` is unchanged, so it could come back. |
| A journey parked on the desk ("Carry on", the clash) | **Flagged, dropped.** The desk answers on the desk. Journeys still open in the drawer, which parks as before. |
| The compose card's note (a dateless note with a paper colour) | **Flagged, dropped.** The workspace adds dated tasks only. Notes are made on the Corkboard, as everywhere else. |
| Done today / Cleared this week | **Covered** by the Done tab ("{n} done this week", by day). |
| Caught up and Nothing yet states (v12) | **Covered** by the workspace's own ("Nothing urgent right now" / "Nothing to do yet"). |
| `ESC_LEVEL.trayBulk`, `trayCalendar`, `dialMenu` | Left in `lib/escapeStack`; nothing uses them now. |

## 4. The commits (all `git commit --only`, explicit paths)

| Commit | Part | Files |
|---|---|---|
| `09fe87137` | 1 · the offer decision joins `stepSaves` | `stepSaves.ts`, `OfferJourney.tsx`, `stepSaves.test.ts` |
| `1090a145d` | 2 · `UserTask.steps`, the link editable | `firestore.rules`, `types.ts`, `db.tsx`, `tests/rules/firestore.rules.test.ts`, `todoNotesTasks.test.ts` |
| `0be96036e` | 3 · the workspace replaces the desktop tray | 56 files: `ws/`, `lib/todoWs`, art, ref, `SetAsidePop`/`MonthCal`/`setAsidePop.css`, `TodoRoute`, `TodoPhone`, `shortcuts`, `useFullScreenList`, four re-pointed tests, `RETIRED-todo-list-v51.md`, 31 deletions |
| `9bc82512d` | 4 · the To do count, and the agent's reply time | `TodoWorkspace.tsx`, `wsFlows.tsx`, `todoWs.ts` (+ test), `replyDatesMoved.test.ts`, the smoke |
| part 5 (the commit carrying this report) | the measurement, CLAUDE.md, this report | `todoWs.measure.ts`, `CLAUDE.md`, `reports/todo-list-v51/` (report + 18 screenshots) |

### Part 1 — one save path

`stepSaves.ts` (Query Centre v149) already held `saveSent` and `saveNudgeSent`, which the drawer's Sent and Nudge
journeys commit through. The desk calls those. The offer decision was the one save it lacked, so `saveOfferDecision`,
`saveOfferMoreTime` and `offerCloseData` were moved into it from `OfferJourney`'s commit. The writes are the journey's
own, moved and not rewritten, and `OfferJourney` now calls them. There is no `deskSaves.ts`.

- ⚠️ **The desk's send dates changed.** The draft used 8 weeks for a partial's reply. The desk now reads
  `stepSaves.sentDefaults`: the house window (12 weeks for a partial or a full) and a nudge a week after, which is what
  the drawer and the Query Centre's clock use since v152.

### Part 2 — data and rules (on the dev line's own files)

- `UserTask.steps?: { text, done }[]`, written whole by `updateUserTask`. `null` or an empty list removes it.
- `updateUserTask` can set and clear `queryId` and `agentId` (`null` clears).
- `isValidUserTask` allows `steps` (a list, at most 50). The task update rule's `affectedKeys` list gained `steps`,
  `queryId` and `agentId`.
- The rules test that said the link is create-only is flipped to allowing it, and a `steps` case was added.
- **Not deployed anywhere.**

### Part 3 — the page

As the v50 report described, with these differences on this line:

- The agent preview is the **address book's `AgentCard262`**. `AgentPanelNew` turned out to be only the add/edit shell,
  with no profile sections. The card's props are built from the Contact list's own libraries (`agentFacts`,
  `agentHistory`, `storyBlocks`, `genreFit`, `colleaguesOf`). Every handler is inert and there is no edit kit, so the
  preview can't write; a click on it opens the real card.
- The section a housekeeping task fills is outlined on the card (`[data-cl262="sec"][data-k=…]`).

### Part 4 — the follow-ups

- **The To do tab** shows `boardFigures(cols).cards`, the sidebar badge's figure, off the same `assembleBoardColumns`
  call. The tray still draws a housekeeping sweep as one row per agent, and each heading counts its own rows.
  - ⚠️ **The dashboard does not share it.** The dashboard has no "waiting on you" figure. Its Next up card says
    "{shown} of {n}", where n is `dashList`'s items: scoped to the active book, and including housekeeping,
    ready-to-query and coming-up items. I did not change the dashboard.
- **Reply time.** Where `responseTimeWeeks` is set:
  - the nudge task's Mentor says "{first} usually takes about {n} weeks to reply, and that's gone by";
  - Gone quiet's says "{first} usually takes about {n} weeks to reply, and it's been {m} weeks with no word".
  - Where it isn't set, neither says anything about it. (The old nudge line, "is past their reply time", was said
    either way.)
- **Reply expected by {date}.** Saving a reply time now names each live query whose date it moves. The date comes from a
  dry run through the Query Centre's own `expectedFor` (`wsFlows.replyDatesMoved`), not from send date plus weeks.
  - ⚠️ A partial or a full reads the house window (v152), and a writer's own date holds, so neither is said to move. The
    old line, "reply dates on their live queries use n weeks from now on", claimed more than the save changes.
  - A send's summary keeps its "Reply expected by" from the house window: by v152's ruling, an agent's reply time is
    for the query, not for a partial or a full.
- **The slider** is 1 to 26 weeks in steps of one, with the mockup's ticks (1 wk, 4, 8, 12, 16, 20, 6 mo).
- **Genres** stay out.

## 5. Things found on the way

1. **`TODO_OPEN_COMPOSER` was never heard on the desktop `/todo`**, so the shell's "+ Task" button did nothing there. The
   workspace listens for it now.
2. **The phone's snooze pop-up never took its intended text colours.** Its rules read `--td5-*` tokens defined only on
   the tray's `.td5-root`, which the phone doesn't have, so eight `color:` declarations resolved to nothing and the text
   inherited. The token lock found it as soon as the rules moved. Those eight declarations are dropped, which changes
   nothing on the phone. Giving the pop-up its intended inks is a design call.
3. **The arrival keys were read before the board had loaded** (in the draft), which could lose a Corkboard task.

## 6. Gates and locks

| Gate | Baseline (`7c6c90d2c`) | After part 4 (`9bc82512d`) |
|---|---|---|
| tsc | 0 errors | 0 errors |
| production build | clean | clean (no error or `[WARNING]` lines) |
| `build:dev` | clean, `index-gBdGm9sz.js` (what dev serves) | clean, **`index-CqjTlKgy.js`** (not deployed) |
| Vitest files | 5 failed, 756 passed | 5 failed, 756 passed (761) |
| Vitest tests | 3 failed, 11384 passed, 3 skipped | 3 failed, 11396 passed, 3 skipped |
| rules (`test:rules`) | — | 244/244 |

The five red files are the same before and after: `functions/eval/run`, `functions/src/email`,
`functions/src/smartImportPhotos`, `smartImportCore`'s SDK-ceiling test, and `src/test/firestoreTarget`'s two
live-guard tests.

**Every new lock was red first:**

| Lock | Red against |
|---|---|
| `stepSaves.test.ts` (journey commits through the save) | the old `OfferJourney` |
| `stepSaves.test.ts` (decline, accept) | a mutation (wrong close key, no recompute) |
| rules: link and `steps` cases; `todoNotesTasks` allowlist | the unchanged rules (2 rules tests + 1 unit test red) |
| smoke render | the page throwing on render |
| swap lock (route, no `v5/` import) | the old `TodoRoute` |
| `todoWs.test.ts` | sweeps no longer expanding |
| Mentor lines | HEAD's `todoWs.ts` |
| `replyDatesMoved` | the naive send-plus-weeks sum |
| tab = badge | HEAD's workspace |

Re-pointed, law unchanged: `todoDueTally.test` (reads the phone page, which still counts by that chain),
`tasksAuditLegend.test` (the To-do surfaces that still draw a calendar), `noteboardTask.test` and
`sidebarCapture.test`.

## 7. The measurement (`tests/e2e/todoWs.measure.ts`, on the emulators)

Run with `npm run e2e:emu -- tests/e2e/todoWs.measure.ts --project=measure --workers=1`. **11 passed** (sign-in + 10
cases, 1.0 min): both widths, the send walk to its review drawer, the Snoozed and Done tabs and both pop-ups, every kind
of task on the desk, an own task added / stepped / linked / deleted, a nudge logged and undone, the preview opening the
real card, **the count** and **the tags way in**. The two writing cases put the account back in the same run.

The count case read **tab 56, sidebar badge 56, 105 rows** (Housekeeping 52 rows under a heading saying 52). The tray
draws more rows than the tab counts, so the case is a real test and not a coincidence of equal numbers.

**Red first, by mutation, in the measurement worktree:**

- tab showing the tray's row count: the count case failed (expected 56, received 105);
- the desktop route mounting the phone page: **all 10** cases failed (the one pass is the sign-in setup).

Screenshots are in this folder. All are from the passing run; neither mutation run reached a screenshot.

The emulator ports were held by the Query Centre session's own run when I first tried. I waited for them to free up
rather than share them.

## 8. Left undone, and for you

1. **Dev deploy (rules and app): not done**, as asked. When you say go:
   - rules: `firebase deploy --only firestore:rules --config firebase.dev.json --project scriptally-dev`;
   - app: re-check that dev still serves `index-gBdGm9sz.js`, then deploy `todo-list-v51` as a new `dev/…-sr1-td51`
     branch (hosting only).
   - ⚠️ That would drop the QC session's six newer `query-centre-v152-1` commits from dev unless they're stacked in too.
2. **Six e2e suites compare against the desktop tray** and will fail on their desktop half. They're left in place and
   named in `RETIRED-todo-list-v51.md`.
3. **Decisions:**
   - the pin, Needs you now, the calendar drawer and bulk close (each can come back on the workspace);
   - whether the phone pop-up should get its intended inks;
   - whether the dashboard's Next up should count the same thing.
4. **Worktrees:** there are 9 besides the primary, more than CLAUDE.md's five. Three are other sessions' scratchpad
   worktrees and one is mine (`ScriptAlly-td51`, kept until the dev deploy and your review). I removed none.
5. **CLAUDE.md's "direct to main" rule.** Proposed wording, not applied:

   > **Packs branch from the dev line, never commit to `main`.** Every pack since October runs on its own branch, cut
   > from the branch dev serves (find it by matching dev's bundle hash), in its own worktree. It deploys to **dev only**,
   > as a new `dev/…-<pack>` branch stacked on the served one, after Nick has read the report. Nothing merges to `main`
   > until Nick consolidates. `main` is behind the dev line, so check `git diff $(git merge-base main <dev>) <dev> --
   > <paths>` before building anything on `main`. CI-on-push, explicit-path staging, `git commit --only` and the
   > clean-tree checks are unchanged.
