# Query Centre v141.1: "With you" includes the nudge window; "Gone quiet" starts where nudging ends

Branch `query-centre-v141-1` (worktree `~/ScriptAlly-qc1411`), on `d984dc9c`. Not merged to main.

## 1. False premises

1. **v141 defined Gone quiet as "past the expected reply date". That was wrong.** It put every nudge-due query in Gone
   quiet: on the seed data, 11 queries that were in their nudge window. Under your model they are With you.
2. **There was not one nudge-window rule. There were three, and they disagreed**, so Step 0 stopped and you chose
   **rule 1, with the rows aligned**:
   - **Rule 1 — `nextAction`, lib/qcCalView** (the Next action grouping and the Birds-eye view): Nudge up to 28 days
     past the expected date; Consider closing beyond that, or after 84 days in a stage with no expected date.
   - **Rule 2 — `leadDoors` / `panelDoors`, lib/queryActions/entry** (each row's Next move, the tray and the panel's
     primary): Nudge whenever past the date; Close only after 365 days with the agent. On the seed data, 24 queries
     read "Nudge" on their row while the grouping filed them under "Consider closing".
   - **Rule 3 — `replyTask`, lib/taskPrecedence** (the To-do tasks, the header's nudge count and the packages page's
     own "gone quiet"): 14 days' grace after the deadline; close after the larger of 2 × the window and 90 days, after
     an ignored nudge, or at once when "no response means no"; the writer's own nudge and close-plan dates win.
3. **None of the three is user-set.** Rule 1's thresholds are constants. Only rule 3 reads settings: the agent's window
   and "no response means no", and the writer's own dates.
4. **The quick pick could not simply be "left alone".** Its predicate, `isYourMoveRow`, also feeds the Contact list
   (`contactList.rowYourMove`), which this pack must not touch. So the quick pick's count and its filter now call
   `whereItStands` directly, and `isYourMoveRow` is unchanged.
5. **L3's break ("swap ≤ for <") cannot be seen at the pack's three points.** One day before, one day past and one day
   past the window all land on the same side whichever comparison is used. L3 also seeds a query **on** the reply date
   and one **on** the 28th day, so each swap moves a query and goes red.
6. **L1 cannot catch its break by comparing the quick pick with the card.** Both now read `whereItStands`, so they
   agree under any definition. L1 also derives With you from each row: its own court, plus the Next move it shows
   ("Nudge", from `leadDoors`).

## 2. Base tip

`d984dc9c` — `dev/main-cl18-…-hr1-hs1-hc1-sil2-wf1-qc141-silf`: v141 plus the Smart Import loader v2 follow-up. Dev
served it as `index-CdPbB1Bc.js`, and the local build of that commit is the same file.

## 3. Step 0 — the nudge-window rule

Rule 1 is now `nudgePhase` in **`src/lib/nudgeWindow.ts`**, lifted out of `nextAction` unchanged:

| Phase | Rule |
|---|---|
| wait | before the expected reply date |
| nudge | past it by 28 days or less (`CLOSE_OVER_DAYS`) |
| close | past it by more than 28 days, or 84 days in a stage with no expected date (`CLOSE_UNDATED_DAYS`) |

The edges are strict: the expected date itself is still "wait", and the 28th day is still "nudge". None of it is
user-set.

Three readers ask it:

- `nextAction`;
- `whereItStands` (the four sets);
- `leadDoors` / `nextDoor` (the row's Next move, the tray and the panel's primary).

Rule 3 (the To-do tasks) is deliberately still separate (§7).

## 4. Seed counts, before and after (the harness account, 87 queries)

| | With you | With the agent | Gone quiet | Closed | "Your move" quick pick |
|---|---|---|---|---|---|
| v141 | 17 | 17 | 36 | 17 | 53 |
| v141.1 | 28 | 11 | 31 | 17 | 28 |

Under v141.1:

- With you is the writer's court (17) plus the agent-court queries inside the nudge window (11).
- Gone quiet equals the Next action grouping's Consider closing (31). That count was 31 under v141 too; Gone quiet
  differed from it because v141 counted from the reply date.
- The rows now agree with the set: the agent-court rows whose Next move reads "Nudge" are exactly With you's agent-court
  part (L1). Before v141.1 the Next move column read Nudge 35 and Consider closing 1.

## 5. The quick pick

**Changed.** Its count and its filter now call `whereItStands(r, now) === "you"`. On the seed data it moves from 53
to 28.

`isYourMoveRow` is untouched, so the Contact list and the "Who it's with" grouping keep their "Your move" (§7).

## 6. Locks: `tests/e2e/qcV1411.measure.ts`, breaks in `tests/e2e/qcV1411Mutate.sh`

The page runs at a fixed clock T: a minute boundary at or before the real time, so the sign-in token never reads as
expired. `tests/e2e/seedQc1411.mjs` seeds six agent-court queries against T (expected dates at T + 1 day, T, T − 1,
T − 28, T − 28.5 and T − 29 days) and removes them in the same run. Every lock checks its population first.

| Lock | Red on the base (dev, d984dc9c) | Red under its break | Green on v141.1 |
|---|---|---|---|
| L1 same set | quick pick 58 against the card's 17; rows 57 | v141-quiet: With you 17 against 30 from the rows | quick pick = card = rows = 30 (with the seeds); card, band and menu agree |
| L2 matches Next action | Gone quiet 41 against Consider closing 33; agent-court With you 0 against Nudge 13 | plus-one-day: the 28.5- and 29-day seeds fall into Nudge (31 against 33) | 33 = 33 · 13 = 13 |
| L3 boundaries (1512 and 1280) | at0, past1 and at28 all in Gone quiet | lte-at-reply-date: at0 in With you; gte-at-window-end: at28 in Gone quiet | all six in place at both widths |
| L4 sum | **green, and it should be**: v141's sets were already disjoint | double-count: card sums to 106 against 93 | 93 = 93; every id in exactly one set |

**L5 (no regression):**

- **On the integration build:** HR1 3/3 (HR1-8 captured from a local build of the base, `index-CdPbB1Bc.js`, the file
  dev serves) · QC1411 5/5 · QC141 10/10.
- **On the v141.1 build** (`index-DbZFPrEi.js`, byte-identical to the integration build): QC140.1 5/5 · CL19 15/15 ·
  CL19.1 9/9 · CL19.2 9/9.
- **QC140: 14 of 15.** **D2** (Escape with the Filters menu open) failed once on a timeout ("page closed", during a
  run that took 11.8 minutes under load).
- **D2 could not be re-run.** Four attempts were refused at sign-in, because the shared account's password quota was
  exhausted. D2 exercises nothing v141.1 changed, and it passed on v141's integration build earlier the same day.
  **It is the one L5 item without a green reading on this build.**
- **The quota failures also wiped the Query Centre guide state on the harness account twice:** each suite's restore
  wrote back an empty read. It was restored through the admin REST API both times, and verified.

**Re-pointed, each with a comment at the check:**

- **QC141 L2 and L3** now derive the sets from each row's due date and stage start on the nudge window. They had
  v141's "past the reply date". QC141's mutation runner quotes `whereItStands(r, now)`.
- **Unit tests:** qcWhere141, panelDoors (it takes the lead now, not the days waiting), qcComingUp (the 365-day
  states became nudge-window states) and qcRowLines (Nudge inside 28 days; Consider closing beyond).

## 7. Left as they are, and open

- **Rule 3, the To-do tasks, still has its own window.** It has a grace period, a ceiling, and the agent's and the
  writer's settings. So a query can read "Nudge" on its row while the To-do list has no task for it yet (within the
  14-day grace), or "Consider closing" a few weeks before To-do suggests it. Unifying the two would change the To-do
  list.
- **The "Who it's with" grouping's Your move band** (and the ungrouped list's) still reads `isYourMoveRow`. Today
  that is 53, so "Your move" reads 53 there and 28 on the quick pick. Moving the gone-quiet queries out of it would
  put them under a "Waiting · not yet due" band, which would be false, so this needs your ruling.
- **"Keep tracking"** still stops Close leading a row. Such a query can be Gone quiet in the card while its row leads
  with Record a response. There are none on the seed data.
- **A gone-quiet row's line:** "OVERDUE SINCE {date}" inside the first year; "NO REPLY · N YEARS" after it, as
  before.

## 8. Integration branch and dev

- **The first integration branch is stale.** `dev/…-qc141-silf-qc1411` (`27efc5b3`, cut from `d984dc9c`) was pushed,
  but dev moved to Import review v1 (`…-silf-irf1`, `4230ebbb`) before the deploy. Deploying it would have taken Import
  review off dev, so it was **not deployed**.
- **The deployed branch:** `dev/main-cl18-…-hr1-hs1-hc1-sil2-wf1-qc141-silf-irf1-qc1411`, cut from `4230ebbb` (dev
  served it as `index-C2WQubzs.js`). The merge is `3f664f21`, with no conflicts.
- **Gates on it:** tsc 0, `vite build` 0 with no warnings, `build:dev` 0, Vitest 636/636 files (9,373 tests).
- **Locks on it:** QC1411 L1–L4 (5 + 3 + 14 + 3 readings) and QC141 L1–L4 all green.
- **QC140 on it: incomplete.** Its runs there were cut short by the password quota: D2, E1 and QC141 L1's guide
  restore failed in `guideFlags`, not in an assertion. QC140's full reading is the 14 of 15 in §6.
- **Dev build:** deployed 20 Oct from a clean detached checkout of `3f664f21`. Dev served `index-C2WQubzs.js`
  immediately before, and serves **`index-Dbgped49.js`** after. Hosting only; no rules or functions changed.
- **The harness account was left as found:** no `q1411-` documents, and the Query Centre guide state back to its
  starting value (verified through the REST API).
