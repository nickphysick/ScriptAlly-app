# Phone app v2, Part 5 — To-do and the Corkboard

Branch `phone-app-v2` (worktree `/Users/nickphysick/ScriptAlly-pa2`). Ref: `design-refs/phone-app-v2/` — screens 24 and 25, `todov.js` (`screenTodo2` at TDB B · TDG A · TDR B, `taskRowV`, `KIND`; the Corkboard at CBV A), the `.wk`, `.wkd`, `.wdots`, `.bstats`, `.seg`, `.rowhd`, `.task`, `.tverb`, `.note`, `.nopin`, `.grid2` rules. The hashes were re-verified (69 OK). Not merged, not on prod.

## False premises

1. **"The Corkboard is `/todo/noteboard`."** Since Corkboard v1 its address is `/todo/corkboard`; `/todo/noteboard` redirects there (`lib/todoRoutes`). The phone's switch points at `/todo/corkboard`, and back works.
2. **"`lib/trayCalendar` … the tray's own tallies."** Both are true. The tallies are `dayBuckets` (overdue, today, later, undated), and they map exactly onto the brief's four groups: From earlier, Today, Coming up, When you have a moment.
3. **"The calendar page (`/todo/calendar`) … stays reachable by URL."** It already redirects to `/todo` (retired 29 Oct, Nick's ruling, before this run). There is no calendar page left to keep reachable; the week strip is its job on the phone.
4. **"Tapping a note opens it … read, edit, link or delete."** The noteboard's own actions are edit, tags, make it a task, and delete. There is no "link". The phone's note sheet offers read, edit and delete through the noteboard's writers. Tags and make-a-task are not built: Not done, item 2.
5. **"Ticking never writes on its own."** An own task's "Done" is the tray's `quickDone`, which writes. On the phone, Done asks first ("Tick off …?") and only then calls `quickDone`. T4 holds that a tap writes nothing.

## What Step 0 found

- **On a phone `/todo` was the old v2 page (`ToDoPage`).** `TodoRoute` now gives the phone `TodoPhone`; the desktop keeps the v5 tray.
- **The derivations are the tray's own four calls, in the tray's order:** `assembleBoardColumns` → `trayItem` → `calendarItems` → `dayBuckets`. The To-do badge (Part 1, `lib/todoDueTally`) makes the same calls, so the band's "from earlier + today" is the badge by construction (T7).
- **Later is the desk's own `SetAsidePop`,** with `setAsideRules` and `snoozeCardWrites`, laid out in a sheet. Its words, including "Can’t be snoozed … Your send-by date passed on …", are the desk's. Its doors (set a send-by date, withdraw, plan a nudge) open the same journeys the desk's `doDoor` opens.
- **The Corkboard's order is the noteboard's own:** `orderNotes(sortNotes(userTasks), prefs.order)`, the call `TodoNoteboardPage` makes.

## Gates

| Gate | Before Part 5 (`80edaa38`) | After |
|---|---|---|
| tsc root / functions | 0 / 0 | 0 / 0 |
| build:dev (grepped) | clean | clean |
| Vitest | 692 files · 10745 passed · 3 skipped | `Test Files 692 passed (692)` · `Tests 10745 passed \| 3 skipped (10748)` |

## Commits

| Commit | What |
|---|---|
| `ad46c604` | 5A–B in one commit: the band, the week, the groups, the rows, the verbs and Later share `TodoPhone.tsx` and one stylesheet. The task flow gained an edit seed. |
| `cd55cabf` | 5C — the Corkboard (`CorkPhone`, `NoteboardRoute`) |
| (this commit) | 5D — locks, shots, pairs, this report. It also carries two fixes the locks found (below). |

## ⚠️ Two faults in 5A–B, found by the locks and fixed in 5D

1. **The desktop Corkboard broke in `ad46c604`.**
   - `TodoRoute` stopped importing `ToDoPage` as a value (only its props type), so the bundler dropped the module and the stylesheets it carried.
   - Some of those sheets also size the desktop Corkboard's grid. Without them its scroller grew to its content: measured `--wpg-port-h` 786 → 1918px.
   - S9, extended to `/todo/corkboard`, caught it: `head 27328 px vs base-to-base 0 px`, DOM not identical (`ledger/desktop.natural-red-type-only-import.json`).
   - `TodoRoute` now keeps a side-effect import of `ToDoPage`, with the reason at the line. S9 is identical on all six routes again.
   - **Between `ad46c604` and this commit the desktop Corkboard was wrong on the branch.** It never reached dev.
2. **The snooze writer's own Undo does not put a task flag back exactly.** It clears `snoozedUntil` and unbumps the count, which differs from the document when the flag already held an older snooze. T5 caught it on the harness account: `snoozedUntil "2026-10-04…" → undefined`. The phone now captures the flag first and writes it back verbatim (`restoreTaskFlag`), as the desk's `captureFlags` / `putBack` do. The one flag the failing run changed was restored by id.

## Locks — PA2-5 (`tests/e2e/phoneAppV2Todo.measure.ts`)

| Lock | Claim | Mutation | Red reading |
|---|---|---|---|
| T1 | the band's three tallies equal the desktop tray's own counts; each group holds its tally | `hk-as-today` | `{"earlier":37,"today":3,"soon":0} vs {"overdue":37,"today":0,"later":0}` |
| T2 | each day's dots are the tasks due that day; housekeeping and offers carry no day | `dot-offer` | `2026-10-29: the dots count the tasks due that day — 2/2 vs 0` |
| T3 | a day filters to its own tasks; a second tap clears | `filter-ignored` | `tapping 2026-10-26 shows that day's tasks only — 55 vs 1` |
| T4 | Send, Nudge and Decide open their journeys; Done asks; nothing writes | `write-on-tap` | `Done asks before it ticks anything off`; `nothing was written by any verb — tasks/seed-cal-carried` |
| T5 | a passed send-by is refused in the existing words; another is snoozed, and Undo leaves the account exactly as it was | `no-refusal` (and the natural red above) | `a passed send-by: "Can’t be snoozed" … — ` (absent) |
| T6 | the notes keep the board's order; tilts within ±2°; the band counts them; each tilt the same across two renders; Add a note opens the note flow | `random-tilt` | `each note's tilt is the same across two renders` |
| T7 | the To-do badge is From earlier + Today | `hk-as-today` | `37 vs 37+3` |
| T8 | the colour laws and no image twice, To-do and Corkboard | CSS `rust-verb` | `red fill on button.pa-tverb.pri (rgb(180, 85, 63))` |
| T9 | the desktop untouched: PA2-1 S9, now including `/todo/corkboard` | the natural red above | see fault 1 |

**The writing cases and the account:**
- T4's `write-on-tap` mutant ticked off `seed-cal-carried`, and its Undo put `done` back but not `updatedAt`. Restored by id, twice: the first run hung on a "Not yet" press with no timeout, now fixed.
- **The tray's own tick-off Undo leaves `updatedAt` moved on the desktop too.** It is the shared `quickDone`, which this part may not change. Not done, item 4.
- After every run the account was compared with a list taken before the part's writing runs.

**Final green on this build:**
- PA2-5 `5 passed` (both sizes and both pages, with setup);
- PA2-4 `4 passed` (it wrote and undid) · PA2-3 `3` · PA2-2 `3` · PA2-1 `10 passed, 2 skipped` (S9 with the Corkboard);
- QM1 `1 passed, 10 skipped` · DM1 `3 passed, 5 skipped`.
The account was unchanged afterwards, against the list taken before. Ledgers are in `ledger/` and `ledger/regress/`.

## Where the app overrode the ref

| Item | Ref | App |
|---|---|---|
| tallies | 2 from earlier · 3 today · 2 coming up | 37 · 0 · 0 on the harness account (the tray's own) |
| groups | 4, every one populated | From earlier and When you have a moment only; empty groups are not drawn |
| row lines | "Send the full to Eleanor" / "Due today" | `rowLines`: the agent leads, then the deed or Nudge / Consider closing, the stage and the agency |
| the pin | terracotta `#c46a55` | navy: the phone allows no red fill (Not done, item 3) |

## Pairs

`pairs/` holds 24 (To-do) and 25 (Corkboard) beside the ref at 390 × 844 and 360 × 780.

## Dev

- **Before:** dev served `index-BkPjilRy.js`, the Part 4 integration `633aa338`.
- **Integration branch:** `dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393-pa2-2-td12-ppp1-pa2-5`, at `cffcac5c` = `633aa338` + `phone-app-v2` at `ebf3be7f`. No conflicts; CLAUDE.md auto-merged.
- **Gates there:** tsc 0 / 0 · build clean · Vitest `Test Files 694 passed (694)` · `Tests 10756 passed | 3 skipped (10759)`.
- **Locks there:**
  - PA2-4 `4 passed` (wrote and undid) · PA2-3 `3` · PA2-2 `3`;
  - PA2-5's Corkboard cases passed;
  - **PA2-5's To-do cases could not start:** To-do v12, another session's work on dev only, removed the desktop today card whose counts T1 reads (`[data-td7="count"]`). v12 states the tray's overdue and today only in its pinned header line and the later count nowhere. The phone's tallies are still `dayBuckets`, the same call v12's tray makes. Recorded for Nick beside Part 3's badge question; the test was not bent to the integration.
  - The account was unchanged afterwards.
- **After:** dev serves `index-D7d8tr1e.js`.

## Not done, and why — for Nick

1. **Housekeeping's "Add" on a sweep of several agents opens the first agent's card at the gap.** The desk opens a sweep across them, which has no phone form yet.
2. **The note sheet has no tags and no "make it a task".** Those are the noteboard's other two actions; they need phone forms.
3. **The pin is navy, not the ref's terracotta,** under the no-red-fill law. If the pin should be an exception like the celebration's stamp, it is one colour value.
4. **`quickDone`'s Undo leaves an own task's `updatedAt` moved,** on desktop and phone alike. Fixing it means changing the shared tick writer, which this part may not touch.
6. **On dev, To-do v12 no longer states the desktop tray's tallies where T1 reads them.** When v12 and this branch meet, T1 needs v12's own statement of the three counts, or v12 needs to keep one.
5. **There is no unit smoke for `TodoPhone` and `CorkPhone`.** These are phone variants of existing routes, not new routes. `pageSmoke` renders in node, and both read the db; the e2e locks render both.

## Worktree

Kept for Parts 6–8.
