# Log a query v2.1: report

Mock v24 (`design-refs/log-a-query-v2-1/`) plus the fixes from the v2 report. Built on branch `log-a-query-v2-1`; dev only. Nothing is merged to main and nothing went to prod.

## First: what in this brief assumed the old query card

Nick's message during the run said the grid card is changing (Plumage colours v2 is on dev; v3 is being built). Taking each part of the brief against that:

- **The paperclip.** Phase 1 says the paperclip keeps working, and Phase 6 says to move its focus ring into the grid card's own stylesheet. Both assume the paperclip stays on the card, but v3 takes it off. **Phase 6 was not done**, because it would mean editing the card's stylesheet, which the message forbids. v2's ring stays scoped to the journey (`.laq .qc151 .qc154-card .qc1533-clip:focus-visible` in `qcLogStages.css`). It stops applying once v3 lands, because the paperclip will be gone.
- **Ref screen 08 (the paperclip open)** shows a card feature that is going away. The build's shot 08 is the card as it renders today.
- **The "Logged" stamp** on the logged screen sits at a fixed spot over the card (104px left, 124px down). This is unchanged from v2. If v3 moves things inside the card, the stamp may need to move.
- **Nothing in the preview restyles the card.** The journey only passes `preview` and places the card under `.laq`. On the review the card now sits 12px under the sub-line; on the logged screen, 18px. Nothing of the journey's clips the area above the card, but I have not measured v3's label against those gaps, because v3 has not landed.
- **Before the next dev deploy,** check what dev serves. If v3 has landed, merge it onto this line (resolve `QcCard154.tsx` as both) and re-run `laqV21.measure.ts` and `laqV2.measure.ts`.

## What landed

| Phase | State |
|---|---|
| 1 Review screen | **landed (measured)**. V21-1: the card's left edge equals the heading's (951px against 951px at 100%; 494 against 494 at 150%) and it runs the full column (1437 against 1437). One sub-line. Three "What went" tiles with their icons, and "your Full submission package". The big numbers read 3 +1 and 5 +1. **No scroll bar at 100%** with the note closed. At 150% the body scrolls, which the brief allows. Shots: 06 at 100% and 150%, 07, 08, 10 and 11. |
| 2 "Tap" out | **landed**. The journey's files hold no "tap" a writer can read (two code comments say "one tap"). |
| 3 Step one | **landed (measured)**. V21-2: Imogen (passed) and Theo (no reply) are no longer under "Not queried yet". Show and Hide work. The rows read "Queried · sent 3 Oct", "Partial requested", "Passed · 12 Sep" and "No reply · closed 2 Nov". They are `div`s with no tab stop. Searching "Imogen" shows her under "Already queried with this book", the last row reads "Add a new agent", and "No one called" does not appear. The units cover five cases: no query, active, passed, no reply, and logged this sitting. |
| 4 Not sent yet | **landed (measured)**. V21-3 passes from both doors. The not-sent task exists once. "I've sent it" on the To-do page opens the journey at Sent with Harriet chosen. Logging marks the task done, and Undo removes the query and reopens the task. The same works from the Dashboard (see the first item under "For Nick to rule on"). |
| 5 Sent today counts today | **landed (unit-locked, red then green)**. `dash2SentToday.test.ts` failed at 09:00 and 00:05 before the fix and passed at 23:55 and for "sent tomorrow". All four pass after. |
| 6 Paperclip ring on the Queries page | **not landed**, because Nick's card message rules it out (see the first section). |
| 7 Old specs | **landed**: nine retired and six updated (see below). Three of the updated ones still fail, for reasons that predate this branch. |

## Step 0

- **Disk:** 33 GB free.
- **Branch:** dev served `dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2-pc2` (`index-D5y_IYfl.js`). That line already holds all of log-a-query-v2's code except its REPORT commit, which I merged in. The branch was cut from it.
- **Ref pack:** it arrived only in `~/Downloads/log-a-query-v2-1.zip`. `sha256sum -c` passes, and the HTML hashes to `9a61543f…caed`. It is committed as `a3be0e9b9`.
- **Baseline:**
  - tsc: 0 errors.
  - build: clean.
  - Vitest: 934 files, **1 failure**: `statusMarksV3Sources` SM3-8, which is not in this journey. It passed in my later full run.
- **Worktrees:** six besides the primary were there before I started; none are mine and I touched none of them:
  - `ScriptAlly-live`
  - `ScriptAlly-mg1`
  - `ScriptAlly-rsp6`
  - `ScriptAlly-tdf`
  - a pc3 checkout
  - another session's scratchpad checkout

  The worktree-claims log also lists many sessions as live.
- **a. The review screen.** It is built by `checkBody` in `QcLogStages.tsx`. Its numbers come from `reviewCounts` in `logStages.ts`, which uses the Dashboard's `liveCount` and `sentAllTime`.
- **b. Why a morning query wasn't counted.** Yes: sent dates are stored at noon of their day, and `sentAllTime` compared them with `now`, so a query sent this morning counted only from midday. The same comparison appears in:
  - `dash2.ts`: `wholeWeeksQuerying`, `sentThisWeek` and `sentWeeks`
  - `dashWeekMix.activeAt` (on the send side)
  - `dashHover.closedCards` (its `futureSent` check)

  `oneScreen.dailyLedger` already counts by day, and `isLive` does no time comparison.
- **c. Who landed in "Not queried yet".** The host passed only active queries (`forBook.filter(qaIsLive)`). So every agent whose query for this book had closed (passed, no response, withdrawn or signed) was listed under "Not queried yet".
- **d. Searching for an agent already queried.** Search used to show that agent greyed under "Already querying", with "queried {date}". But the last row still read "Add {name} as a new agent" unless the name also matched a ready agent.
- **e. Can a task carry a button?** A UserTask has no field for an action. Nudge and close tasks are derived from board cards (`drawerDoorForTask`), not stored tasks. The held task already stores `agentId` and `manuscriptId`, and the rules allow both. No new field is possible without a rules change, because `isValidUserTask` and the update rule both use `hasOnly()`. So the door is derived from fields the task already has (Phase 4), and **no rules change was needed**. One finding: v2's held task had no due date, which makes it a "note". The To-do list and the Dashboard never draw notes, so it showed only on the Noteboard.
- **f. The paperclip's focus ring.** On the Queries page it has none: qcv154's `.qc1533-clip.qc1533-clip:focus { all: unset }` outranks it. v2 fixed it only inside `.laq`.
- **g. The older specs.** The list is under Phase 7 below.

## Decisions I took

1. **What the tiles are called.** A letter or synopsis tile shows the name of the version that went. The kind comes from the material itself, never from its label. A generic letter shows the app's own word, which `formatQueryMaterial` gives as "Covering letter" (see V21-1 shot 10).
2. **Where the review card is full width.** Only on the review screen (`.laq-pvw.is-wide`). The logged screen keeps v2's 425px, because "the logged screen is unchanged".
3. **The note placeholder** is the ref's: "A note, only you see it".
4. **Status words on step one.** They are the Queries page's (`standWords`), not the ref's "Waiting", so an active query reads "Queried · sent 3 Oct". "No reply · closed {date}" follows the ref.
5. **Which agents can be seeded.** `querying` still means "has an active query", so the agent card's "Log query" door for an agent whose query closed works as before. Re-querying is out of scope (D5), so I left it alone.
6. **How the held task is recognised.** `heldSendDoor` needs four things: the task is open, it has an agent and a book, it has no query, and its text is the exact words the journey writes. **A writer who renames the task loses the button.** The task itself is untouched.
7. **The held task is dated today.** That makes it a task rather than a note, so the To-do list and the Dashboard draw it.
8. **The To-do button** is on the task's open view (the desk), beside the mentor's note, not on the tray row. The row is already a `role=button`, so a button inside it would be a nested control.
9. **The Dashboard.** The held task leads Next up's "Ready to query" group, with "I've sent it" (the same drawer door every Next up button uses). `listPlan` keeps that group on the list, behind the work groups, only while it holds a held task. The group order itself is unchanged.
10. **"It has gone after all" is removed.** The footer is "Done" only, as the ref shows. The task's own "I've sent it" goes back to Sent and keeps the task; logging then completes it.
11. **Undo** reopens any task that logging completed.

## Where the build differs from the ref, and why

- **The query card** is the real grid card in its Plumage colours v2 look, not the ref's markup, by rule.
- **The past-the-date card** keeps the grid card's own words, not "Response overdue", by the brief.
- **On step one an active query reads "Queried · sent …"**, the app's word (Decision 4).
- **The To-do page's button** is on the task's open view, not drawn inline as on ref screen 04 (Decision 8). Screen 04's inline task is how the journey shows the task, and that one is built as in the ref.
- **Screen 09 (logged)** has no new shot, because the screen is unchanged from v2. It is in `reports/log-a-query-v2/shots`.

## For Nick to rule on

1. **The Dashboard shows only three items in Next up** (`NEXT_SHOWN = 3`), and the held task sits behind every work group. On the harness account it was not drawn at all. The measurement reached it with the Dashboard's dev review aid (`__SA_DASH_DROP`), and the button then works. The not-sent screen says "The task sits on your To-do page and your Dashboard. The button works from both." The second sentence is true only when the task is among the three shown.

   Should a held task rank higher? That would change the list order you ruled as "the order is the law".
2. **Renaming a held task removes its button** (Decision 6). A stored marker would need a rules change.
3. **Older checks with no cover now:**
   - the 25th-query milestone (LAQ7)
   - reduced motion (LAQ8)
   - the track's node sizes (LAQ9)
   - a sample taken from further in the book (V12-5)
   - the Materials step at narrow widths (V13-1)
   - pieces kept when going Back or switching branch (MF-3/4)

   Retiring their specs removed them, because v2 replaced the screens.
4. **Three older specs still fail. None of the failures comes from this branch.**
   - **qc149 L11:** `laqLib.carryOnMaterials` still clicks v1's letter radio (`pc-opt`).
   - **cl251 B1:** the Contact-list half passes all its header checks. The Query Centre half fails because the Queries page no longer has the v149 flow frame (`data-qc149f="log"`).
   - **cl251 B2** (Record a response) fails for the same reason; it is not this journey.
5. **"Tap" in desktop copy elsewhere:** none found. "Tap" appears only on phone surfaces (`PhoneFlowShell`, `PhoneTaskScreen`, `PackagesPhone`), which I did not change.
6. **Phase 6 is waiting on v3.** The Queries page's paperclip still has no focus ring until v3 removes the paperclip.

## Phase 7, by file

| File | Result |
|---|---|
| laqV1 | retired: v2 replaced the slip, the FlowHead line and the carry-over line. Now covered by V2-6 and V2-8 (see the gaps above). |
| laqV12 | retired: covered by V2-1, V2-4 and V2-9. |
| laqV13 | retired: covered by V2-4, V2-5 and V2-6. |
| laqFork | retired: covered by V2-4 and V2-7. |
| laqFidelity, laqFidelity13, laqScreens11 | retired: they compared against the v1.1 and v1.3 refs. Covered by the V2-1 and V21-1 shots. |
| laqShots, laqSideBySide | retired: v1 shot walks. Covered by the laqV2 and laqV21 compare sheets. |
| laqV2 | updated (V2-3, V2-6): **all 10 pass** on this tree. |
| qc149 L11 | updated (the preview selector): **still failing** (item 4 above). |
| cl251 B1 | updated (the v2 header): **7 of 8 pass**; the Query Centre half fails (item 4). |
| laqLib, nb1Lib, cl251Lib | updated: a comment, and the open-page waits now accept the grid card. |
| addAgentV1 AA13 | unchanged: passes. |

## Measured

- **The first full run:** 15 passed and 3 failed:
  - V21-3 failed on its Dashboard half, then passed in the second run using the review aid.
  - qc149 L11 and cl251 B1 are explained above.
- **Nothing under 12px** in the panel (V21-4, V2-10): `under12` is empty.
- **No layout shift on hover:** `hoverMoves` is empty.
- **Keyboard only, from open to logged:**
  - V21-4 logged Harriet by keyboard, and Undo removed the query.
  - `noRing` is empty.
- **The card's left edge** equals the heading's: 951 against 951 at 100%, and 494 against 494 at 150%.
- **The header seam** (V2-1 on this tree): 0 off-navy pixels at 100, 110, 125 and 150%.
- **tsc:** 0 errors.
- **Build:** clean.
- **Full Vitest:** 934 files, 13,295 tests, **0 failures**. It exited 1 only because of the worker timeout under load ("Timeout calling onTaskUpdate") that CLAUDE.md describes. No worse than baseline.
- **Compare sheet:** `reports/log-a-query-v2-1/compare/index.html`, ref screens 01–11 beside the build.

## Branches, commits and dev

- **Branch:** `log-a-query-v2-1` @ `43a20e68b`, plus this report's commit. Pushed, NOT merged.
  - `a3be0e9b9` the ref pack
  - `5ac3165b2` Phase 1
  - `d5cb15a8b` Phase 2
  - `8ea81a37b` Phase 3
  - `2c88702f6` Phase 5
  - `634a61ddf` Phase 5 (cont.)
  - `b9081b4ed` Phase 4
  - `f66381fe8` decisions
  - `207fd7d5f` Phase 7
  - `43a20e68b` measured
- **Dev line:** `dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2-pc2-laq21` @ `43a20e68b`. It is a fast-forward of the served `…-laq2-pc2` line (`b6bb20129`).
- **Dev now serves `index-Cpnb5ALN.js`** (https://scriptally-dev.web.app). It was built from a clean checkout of that pushed commit, and the deploy was guarded on the served hash.
- **To back it out:** redeploy `dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2-pc2` (`b6bb20129`, `index-D5y_IYfl.js`).
- **Not touched:** main, prod, Firestore rules and indexes, `recomputeQuery`, the grid card's look, the slide-out card, the agent card, Record a response, phone layouts, plan gates and the Offer colours.
