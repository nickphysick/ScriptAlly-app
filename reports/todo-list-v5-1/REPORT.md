# To-do list v5.1 — the journeys on the desk, one screen, and set aside

Built overnight on 15–16 Oct from the v5.1 pack. Branch `todo-list-v5-1` (worktree `../ScriptAlly-todov51`). References: `design-refs/todo-list-v5/` (unchanged from v5) and `design-refs/todo-list-v5-1/` (new, enrolled); all 48 files matched their SHA256 before anything was built.

## False premises

1. **"Base: the branch dev serves."** No `dev/…` branch is left on the remote. Nick merged the whole dev stack into `main` (`30439920`), and `main` is what dev serves (`index-HLaL39lM.js`) plus two report files. **`origin/main` is the base**; v5 was already on it, so Parts A–D and G (v5) were treated as built and only the v5.1 changes were made (see "Base" below).
2. **"The journey's head as the panel's: a mono eyebrow and the title."** The panel's head is the ink header with the quill and the agent card. The desk re-dresses that shell from its own CSS (`.td5-jslot`): plain eyebrow and title, no quill, no agent card. **The ✕ stays.** It is the journey's only way to *discard* answers (Escape and "Finish later" park them, per decision 8), and the reference drew no ✕.
3. **"Parking … coming back offers Carry on at the parked step."** On the base, a journey parked from a panel came back at its preset step with every answer gone. When `req` went null, the drawer moved the parked journey's portal from the panel's slot to `document.body`, and moved it back on resume; each move remounts it. **This was true of the query panel's own parking too.** Fixed in the host hook (§0.9 below); TD5 E3 is the lock.
4. **"The nudge journey: answer step 1."** The nudge door opens on its *second* step, "The nudge" (`nudgeTab: "sent"`). "Where it stands" and its three choices are one step back.
5. **"An exclusive's end" as a snooze ceiling.** No stored field records an exclusive (`exclusive_expiring` is a declared task type nothing raises). No cap is built for it. The send-by date (`expectedSendDate`) and the offer's answer-by date (`offerResponseDeadline`) are the two deadlines that exist.
6. **"Agent tasks: the profile's edit time."** An agent stores no edit time. `lastCheckedDate` records verification, `mswlCheckedAt` covers only the wishlist, and the agent-updated activities carry no agent id. So an agent task's dismissal holds until it is brought back, and every surface says **"Back only if you bring it back"** (§I.2's own fallback).
7. **"It captures every field the v2 composer captured."** The v2 composer captures text, a due date and an agent. The *older* To-do composer captured detail, `surfaceOffset` and tags too. The compose card captures all of those, plus one link (query, agent or manuscript) and a note's paper.
8. **"`setAsideItems(user, taskFlags, agents, queries, nowMs)`."** It needs the activities too, to know whether a dismissal still holds, so it takes them as a sixth argument.
9. **"Every snooze passes `clampSnooze`, as today."** The desk's and the phone's write path (`snoozeCardWrites`) called `clampSnooze` *without* the deadline, so no deadline capped any write. It now passes one (TD5 I2, unit and rendered).
10. **"Undo restores the account byte-for-byte" through "the same writer".** The flag writer (`upsertTaskFlag`) always writes a whole document. Undoing a first snooze through it left a flag behind with no stance, so the two halves of the sentence contradict each other. **Byte-for-byte won:** a new `restoreTaskFlag(id, flag | null)` writes back exactly what was captured (or deletes it). Own tasks go back through `restoreUserTask`.
11. **"At 1512 × 900 every step of the sent journey … fits with no scroll inside the card."** The real sent journey's reading-window step and its review draw the reading-window track, which the reference's stand-in journey does not. Steps 1–3 fit; the reading-window step scrolls by 81px and the review by 155px, inside the card body only (see "For Nick").
12. **"The tray's strip … sticky at the top of the tray's own scroller."** v5's strip and bands stuck under the *page's* navy row. With one screen the tray is its own scroller, so they stick at the tray's top and under the strip. TD5 C1 is rewritten for that.
13. **The obvious class names collided.** `.td5-pop` and `.td5-opt` were v5's filter popover and `.td5-seg` the timeline's segments, and the new rules restyled both at equal specificity, later in the sheet. The v5.1 names are `td5-sapop`, `td5-chp` and `td5-modeseg`.

## Base

- **Tip used: `origin/main` at `30439920`** ("Merge the onb-v9 and import-truth deploy records into main"). Its source equals what dev serves (`git diff 0a6e5bcd origin/main` adds two report files only).
- **v5 had landed** (TD5 locks present): Parts A, B, C, D and G of v5 were treated as built. The v5.1 changes to C and D were made with the part that needs them:
  - the Started tag and Carry on → E;
  - the tray's add row, `N` and an own task's Edit → F;
  - the tabs, Back tags, `S`/`D` and "Move it" → I.
- Submission packages v4 **is** on the base (PK4 locks present).
- Baseline gates before any edit: tsc 0 · production build clean · Vitest 588/588 files, 8,852 passed, 3 skipped · `build:dev` clean.

## §0 findings

- **§0.9 — the journey host.** `QueryDrawer` portals a panel-mode journey into `SIDE_SLOT` when the request carries `panel`. **The single host hook** is `OpenRequest.panel.slot` (a selector; default `SIDE_SLOT`). Its second half, found by E3, is that the slot is resolved for the request *or the live parked journey*, so a parked journey keeps its host. Both live in the same lines of `QueryDrawer.tsx`; `deskHost.test.ts` locks them. Nothing else in `queryActions/**` changed. The desk owns one slot node for the page's lifetime and moves it between the working card and a hidden holder (`v5/deskSlot.ts`); a portal whose container changes is a new portal.
- **Door coverage (`drawerDoorForTask`):**
  - covered: partial, full and R&R requests and `offer_send_full` → sent; `nudge_overdue` → nudge (preset "sent"); `no_response_close` → close (preset "noreply"); `offer_received` → offer (step 1); `offer_tell` → the offering query's offer; `withdraw_tell` and `signed_tell` → edit (told).
  - **still on old routes:** `data_quality_poor` (the agent card, by design), own tasks (their tick), `agent_recheck` (no journey, by Nick's ruling), and any card the sweep handles (`materials_unrecorded*`).
- **Completion kinds that carry a date:** drawer activities (`eventKey`, day-only at noon), the `data_quality_poor` flag's `resolvedAt`, and own tasks' `completedAt`, all as v5 recorded. Snoozes and dismissals are not counted as cleared.
- **Notes linked to agents:** yes. A dateless `UserTask` carries `agentId`/`queryId`, so the pinned note is unchanged from v5.
- **§0.11 — subjects with no edit time:** **agents** (see false premise 6). A query's change is its newest activity, and a noon-exact date counts as the end of its day, because the drawer dates acts at noon.
- **§0.12 — composer fields:**
  - v2 composer: text, `dueDate`, `agentId`.
  - full To-do composer: text, `detail`, `dueDate`, `surfaceOffset`, `tags`.
  - the compose card: all of those, plus one link (`queryId`/`agentId`/`manuscriptId`) and a note's paper (`colour`, its own write, as the Corkboard does).
  - nothing was dropped. Editing cannot move a link (`updateUserTask` has no link fields), and the card says so.
- **§0.13 — the popover's doors:**
  - "Set a new send-by date" → the edit journey with `preset.sendBy` (the stand card's door);
  - "Withdraw the query" → the close journey with `closeWhy: "withdraw"`;
  - "Schedule the nudge instead" → the nudge journey's plan tab;
  - all three run on the desk.

## Calls I made

1. **The base.** I used `origin/main`, because the dev branches were gone and `main` is what dev serves (false premise 1). I treated v5's Parts A–D and G as built.
2. **One commit for Part I, not two.** The pack allowed a second commit for I.7 when it touches shared code. Splitting would have left a commit where the desk still imported the deleted `hiddenItems` and did not build, so I.2, I.6 and I.7 landed together. The lock-found fixes went in their own commit (`84f53a29`).
3. **The host hook has two halves** (false premise 3): the request names its slot, and the slot is resolved for a live parked journey too. Both sit in the same three lines of `QueryDrawer.tsx`, and both decide only *where* the journey is hosted. I read that as the single host hook the pack allows rather than a second change, and I name it here so you can overrule it. The query panel's own parking gets the fix as well.
4. **The ✕ stays on the desk's journey** (false premise 2). Without it a writer with answers could only park them, never discard them.
5. **The parked chip.** While the parked journey belongs to a task in this tray, the corner chip is hidden (`body.td5-parked-here`), because the row's Started tag says the same thing. It comes back for a clash, and for a journey parked anywhere else. A clash started *from the desk* is asked on the card itself ("Finish it" / "Discard and start").
6. **Escape on the desk is the journey's own Escape**: calendar → confirm → leave, parking with answers. The pack's "step" layer (back one step on Escape) is not in the journeys, and the journeys stay unchanged.
7. **The real journeys win over the reference's stand-ins** (the pack's own rule): their steps, questions, defaults, foot order and consequence line are unchanged. The foot reads "Next · … / Review / Cancel" in the journey's own order.
8. **No new stored fields; one new writer.** `restoreTaskFlag` writes or deletes a whole flag document. It is the Undo the set-aside choices need to be byte-exact (false premise 10). No rules change: deleting a flag was already allowed.
9. **Own tasks' "Move it"** writes `dueDate` through `updateUserTask`, and its Undo writes the task back verbatim through `restoreUserTask`.
10. **"Would raise · n tasks"** needed the task list before rule mutes, which only the engine in `db.tsx` makes. So `db.tsx` now also exposes `tasksIgnoringMutes`, derived beside `tasks` and stored nowhere.
11. **A day-only act counts as late in its day** (§0.11). The safe direction: an act logged the same day as a dismissal brings the task back rather than leaving it hidden.
12. **An own task committed to today stays on the board** even before it surfaces (I.6's one exception): committing it is the writer saying it is today's work.
13. **The compose card's find list** shows queries, then agents, then manuscripts, capped at 40 until you type.
14. **The tray's add row is the tray's last row**, after the groups. On the Set aside tab it is not drawn, and "Manage tags" sits there instead.
15. **The popover's "Pick a date"** uses an inline month calendar, the same one the compose card uses, with every day past the cap disabled.
16. **Tests that write restore after a three-second wait**, because a timed-out case's body can still be writing (a base run left one flag that way; removed by hand, see "For Nick").

## Locks

**One consolidated run at `90ba567f`** (`build:dev`, `vite preview` on 127.0.0.1, one worker, 1512 × 900 and 1280 × 800 with the shell): **20 locks, 21 tests passed, 527 readings, 0 red** (`tests/e2e/todoV5.measure.ts` + `todoV51.measure.ts`; ledgers in `ledger/`).

| Lock | Readings | Red on the base build (`30439920`) | Named mutation, and the readings it reddened |
|---|---|---|---|
| A1 | 16/16 | — (v5, unchanged) | proved in v5 |
| A2 | 26/26 | — | proved in v5 |
| B1 | 6/6 | — | proved in v5 |
| C1 | 10/10 | red | the band loses its sticky offset (in page) → 8/10 |
| C2 | 20/20 | — | proved in v5 |
| C3 | 244/244 | — | proved in v5 |
| D1 | 18/18 | red | the keys bound with no stand-down, so a `j` typed in a field moves the selection (in page) → 16/18 |
| D2 | 25/25 | red | the stamp's hold removed (`surfaceOpen` dropped from the ghost guard) → 23/25 |
| E1 | 17/17 | red | the desk's slot not passed (`slot: DESK_SLOT` removed) → 7/17 |
| E2 | 28/28 | red | the door's preset dropped (`preset: undefined`) → 24/28 |
| E3 | 6/6 | red | leaving discards and closes instead of parking → 3/6 |
| F1 | 13/13 | red | `surfaceOffset` not written → 12/13 |
| G1 | 13/13 | — | proved in v5 |
| I1 | 6/6 | red | `dismissalHolds` compares against the snooze date instead of the subject's last change → 4/6 (re-proved after the poll below) |
| I2 | 10/10 | red | the capped chips' disabled state stripped, so "In a month" goes through (in page) → 8/10 |
| I3 | 20/20 | red | Dismiss asks a confirmation first (the one-press dismiss is gone) → 16/18 |
| I4 | 10/10 | red | a dismissal's restore clears `snoozedUntil` instead of `skippedAt` → 8/10 |
| I5 | 3/3 | red | I.6's `waiting` filter removed → 1/3 |
| L1 | 20/20 | — | proved in v5 |
| J1 | 16/16 | red | the sheet grows with its content, no longer one screen (in page) → 8/16 |

- **The base run** (the same two files against `30439920`, port 4762): 13 failed, 1 passed — exactly the thirteen v5.1 locks, every one red. The seven v5 locks were not re-run there.
- **Mutations** were applied in the measurement worktree (`../ScriptAlly-todov51mut`): in-page ones through `TD5_MUTATE`, source ones by `mut.py` and restored from a path-derived backup. Each restore was checked with `git status --short` (empty). Logs: `/Users/nickphysick/todov51-logs/mutations*.txt`, `mut-I1-poll.txt`.
- **I1's sixth reading flaked once in the first consolidated run** (a fixed 1.5s wait was shorter than the snapshot under a long run). It now polls for up to 10s (`90ba567f`). The claim is unchanged, and the mutation still reddens it ("still on the tray after 10s").
- **Unit locks:** `deskHost.test.ts` (the host hook's two halves), `todoSetAside.test.ts`, `taskSettings.test.ts` (TD5 I4, unit), plus the retargets listed in `tests/e2e/RETIRED-todo-list-v5.md`. Vitest on the branch at Part H: 589/589 files, 8,865 passed, 3 skipped (baseline 588 files, 8,852 passed). Nothing since H touches `src/`.

**L2, no worse than base.** Nineteen other suites, run on this branch and on the base build:

| Suite | This branch | Base |
|---|---|---|
| qcV138, 1381, 1383, 1384 · contactV17, 171 · pk4 · queryPanelV2 · headerV3 | pass | pass |
| qcV1382 | C1 red | C1 red |
| calAct63, calBehav63, calBar63, calCard65 · mastheadMatrix | same reds | same reds |
| qaLocks | H9, D7 red | H9, D7 red |
| qaJourneys | 15 passed (re-run; the first run died at sign-in) | 15 passed |
| corkboardV1 | 16 passed after B2's re-point | 16 passed |
| headerPanelV2 | packages P1/P4/P7, the 390 overflow, the floor — as base, after P8's re-point | the same |

- **qaLocks H7 failed once on this branch and passed on re-run,** alone and in the full file; on base it passed both ways. I read it as a flake, not a regression.
- **Re-pointed, law unchanged:** corkboardV1 B2 (the header's Task opens the compose card on the desk) and headerPanelV2 P8 (the header's Set aside switches the tray to its Set aside tab). Both are recorded in `RETIRED-todo-list-v5.md`.

## Screens

Taken with `TD5_SHOTS=1` (`tests/e2e/todoV5Shots.measure.ts`, plus D2 for the stamp) at `90ba567f`, on the harness account, into `reports/todo-list-v5-1/shots/`. Each sits beside the reference of the same name.

**v5 set (refs in `design-refs/todo-list-v5/screens/`)**

| Screen | Build | Reference |
|---|---|---|
| 01 top @1280 | `shots/01-top-1280.png` | `todo-list-v5/screens/01-top-1280@2x.png` |
| 01 top @1512 | `shots/01-top-1512.png` | `todo-list-v5/screens/01-top-1512@2x.png` |
| 02 tray-and-desk @1280 | `shots/02-tray-and-desk-1280.png` | `todo-list-v5/screens/02-tray-and-desk-1280@2x.png` |
| 02 tray-and-desk @1512 | `shots/02-tray-and-desk-1512.png` | `todo-list-v5/screens/02-tray-and-desk-1512@2x.png` |
| 04 stamp @1512 | `shots/04-stamp-1512.png` | `todo-list-v5/screens/04-stamp-1512@2x.png` |
| 05 filtered @1280 | `shots/05-filtered-1280.png` | `todo-list-v5/screens/05-filtered-1280@2x.png` |
| 05 filtered @1512 | `shots/05-filtered-1512.png` | `todo-list-v5/screens/05-filtered-1512@2x.png` |
| 06 just-the-desk @1280 | `shots/06-just-the-desk-1280.png` | `todo-list-v5/screens/06-just-the-desk-1280@2x.png` |
| 06 just-the-desk @1512 | `shots/06-just-the-desk-1512.png` | `todo-list-v5/screens/06-just-the-desk-1512@2x.png` |
| 07 caught-up @1280 | `shots/07-caught-up-1280.png` | `todo-list-v5/screens/07-caught-up-1280@2x.png` |
| 07 caught-up @1512 | `shots/07-caught-up-1512.png` | `todo-list-v5/screens/07-caught-up-1512@2x.png` |
| 08 empty @1280 | `shots/08-empty-1280.png` | `todo-list-v5/screens/08-empty-1280@2x.png` |
| 08 empty @1512 | `shots/08-empty-1512.png` | `todo-list-v5/screens/08-empty-1512@2x.png` |
| 09 empty-lower @1280 | `shots/09-empty-lower-1280.png` | `todo-list-v5/screens/09-empty-lower-1280@2x.png` |
| 09 empty-lower @1512 | `shots/09-empty-lower-1512.png` | `todo-list-v5/screens/09-empty-lower-1512@2x.png` |
| 02b scrolled (no ref) | `shots/02b-scrolled-1280.png`, `-1512.png` | — |
| 03 drawer | **not taken** — the drawer over the page is what v5.1 retired; 10 replaces it | `todo-list-v5/screens/03-drawer-*` |

**v5.1 set (refs in `design-refs/todo-list-v5-1/screens/`)**

| Screen | Build | Reference |
|---|---|---|
| 10-desk-journey | `shots/10-desk-journey-1280.png`, `-1512.png` | `todo-list-v5-1/screens/10-desk-journey-1280@2x.png`, `-1512@2x.png` |
| 11-journey-review | `shots/11-journey-review-1280.png`, `-1512.png` | `todo-list-v5-1/screens/11-journey-review-1280@2x.png`, `-1512@2x.png` |
| 12-compose-task | `shots/12-compose-task-1280.png`, `-1512.png` | `todo-list-v5-1/screens/12-compose-task-1280@2x.png`, `-1512@2x.png` |
| 13-compose-note | `shots/13-compose-note-1280.png`, `-1512.png` | `todo-list-v5-1/screens/13-compose-note-1280@2x.png`, `-1512@2x.png` |
| 14-snooze-nudge | `shots/14-snooze-nudge-1280.png`, `-1512.png` | `todo-list-v5-1/screens/14-snooze-nudge-1280@2x.png`, `-1512@2x.png` |
| 15-snooze-date-passed | `shots/15-snooze-date-passed-1280.png`, `-1512.png` | `todo-list-v5-1/screens/15-snooze-date-passed-1280@2x.png`, `-1512@2x.png` |
| 16-snooze-capped | `shots/16-snooze-capped-1280.png`, `-1512.png` | `todo-list-v5-1/screens/16-snooze-capped-1280@2x.png`, `-1512@2x.png` |
| 17-snooze-offer | `shots/17-snooze-offer-1280.png`, `-1512.png` | `todo-list-v5-1/screens/17-snooze-offer-1280@2x.png`, `-1512@2x.png` |
| 18-dismiss-rule | `shots/18-dismiss-rule-1280.png`, `-1512.png` | `todo-list-v5-1/screens/18-dismiss-rule-1280@2x.png`, `-1512@2x.png` |
| 19-own-task-move | `shots/19-own-task-move-1280.png`, `-1512.png` | `todo-list-v5-1/screens/19-own-task-move-1280@2x.png`, `-1512@2x.png` |
| 20-back-today | `shots/20-back-today-1280.png`, `-1512.png` | `todo-list-v5-1/screens/20-back-today-1280@2x.png`, `-1512@2x.png` |
| 21-set-aside-tab | `shots/21-set-aside-tab-1280.png`, `-1512.png` | `todo-list-v5-1/screens/21-set-aside-tab-1280@2x.png`, `-1512@2x.png` |
| 22-set-aside-switched-off | `shots/22-set-aside-switched-off-1280.png`, `-1512.png` | `todo-list-v5-1/screens/22-set-aside-switched-off-1280@2x.png`, `-1512@2x.png` |
| 23-snoozed-undo | `shots/23-snoozed-undo-1280.png`, `-1512.png` | `todo-list-v5-1/screens/23-snoozed-undo-1280@2x.png`, `-1512@2x.png` |

**/todo at 1920 and 1024:** `shots/todo-1920.png`, `todo-1920-sheet.png`, `todo-1024.png`, `todo-1024-sheet.png` (the page at rest, then scrolled to the one-screen sheet).

Two things that differ from the references on purpose:
- the journey cards are the real journeys (false premises 2 and 11): their ✕ is there, and the reading-window step is taller;
- 14–18 are taken with the page at rest, so the header is in the shot above the sheet.

## Integration branch and dev

- **Dev before:** `dev/main-cl18` at `e752fdde` (Contact list v18 on main), bundle `index-CGTPomg3.js`. It moved during this run; at the start dev served `30439920`'s `index-HLaL39lM.js`.
- **Integration branch:** `dev/main-cl18-todo51`, off `origin/dev/main-cl18`.
  - `a273f860` merges `todo-list-v5-1` (`--no-ff`); `34bb58d2` merges the I1 poll fix.
  - The only conflict was `design-refs/.refhashes.json`, resolved as the union; `check-design-refs` reports 331 refs unchanged.
  - The two branches touch no common source file.
- **Gates there:**
  - tsc 0, production build clean, `build:dev` clean.
  - Vitest 591 files: 590 passed first time, 8,865 tests passed and 3 skipped; the 591st (`functions/src/email.test.ts`, 9 tests) failed first only because the worktree had no `functions/node_modules`, and passed once that was linked.
- **Locks there** (port 4764): TD5 20/20 locks, 527 readings, 0 red; CL18 (`contactV18.measure.ts`) 15 passed.
- **Deployed:** hosting only, `--config firebase.dev.json --project scriptally-dev`, from a clean checkout of the pushed tip. Dev served `index-CGTPomg3.js` immediately before.
- **Dev now serves `index-DJYbAEwI.js`.** Prod, prod rules and functions are untouched. Nothing is merged to main.

## For Nick

- **The `surfaceOffset` call.** The compose card offers the three values the type has — *On the day* (the default, as the old composer's), *A day early*, *A week early* — and the line under it says what that means ("…and to the top of your tray a day early"). With I.6 an own dated task is **not on the board until it surfaces**, so this choice now decides when a task appears at all, not only how it sorts. The one exception is a task committed to today (Call 12). If you would rather a task sit on the board from the moment it is written, that is one filter in `todoColumns.boardColumns` (`waiting`).
- **What did not fit on one screen at 1280.** The sheet, its head and its foot always fit; only the card body scrolls. Overflow inside the card body, measured on the harness account:
  - 1512 × 900: the sent journey's steps 1–3 **0px**; the reading-window step **81px**; the review **155px**; the compose card **0px**.
  - 1280 × 800: steps 1–3 **30, 104, 73px**; the reading-window step **256px**; the review **308px**; the compose card **152px**.
  - The reading-window track is what the reference's stand-in journey does not draw (false premise 11). Shortening it would mean changing the journey, which the pack keeps unchanged.
- **Task types still on old routes:** `data_quality_poor` (the agent card, by design), own tasks (their tick and "Move it"), `agent_recheck` (no journey, by your earlier ruling), and the sweep's `materials_unrecorded*` cards. Every query-action kind now opens on the desk.
- **Cleared this week reads 0 on the harness account.** That is true: nothing on that account was cleared this week (Monday to now) before the run, and the locks' own saves are undone, so they leave nothing behind. D2 watches it go to 1 on a save and back to 0 on Undo.
- **Ledes a task kind could not fill (drawn as no lede, never a placeholder):**
  - a `data_quality_poor` card whose agent no longer has a gap;
  - a sweep or fix card whose own subtitle is empty or uses a word the page forbids (`agent_recheck` is the usual one);
  - an own task or note with no detail.
- **What became visible in Set aside on the harness account: 2 items.**
  - 1 legacy dismissal (an agent's `data_quality_poor` flag, dismissed before v5.1 and holding, because an agent has no edit time).
  - 1 rule mute (`dq_materials`, switched off in Settings; "Would raise" counts what it hides).
  - 0 legacy mutes.
  - Before v5.1 neither was listed anywhere on the page.
- **Account residue, cleaned by hand.** A base-build run that timed out left 3 probe tasks and one flag (`nudge_overdue__q_thin-q-chase`, `skippedAt` 16:59Z) on the harness account; all four were deleted. Tests that write now wait 3s before restoring (Call 16).
- **Prod rules are untouched by this pack.** No rules changed: `restoreTaskFlag` deletes or writes a whole flag document, which the existing rules already allow.
