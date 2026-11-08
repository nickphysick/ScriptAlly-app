# Undo and bulk close are all-or-nothing v1 — report (8 Nov 2026)

Audit 2026-11-07, High 6 and High 7. Branch `fix/undo-bulk-close-v1`, cut from `main` @ `8069e3396`. Local only, not merged.

## 1. False premises and surprises, before anything was touched

1. **"`main` contains the merges of the three fix branches" was false when the pack was first run.** `main` was at `77ff49029`, and none of `fix/ai-spend-guard-v1`, `fix/deps-v1` or `fix/timeline-writer-v1` was in it. The run stopped at Step 0. Nick then asked for the three to be merged in that order, with the full gates after each, and for `main` to be pushed. That is done:

   | After merging | Commit | tsc / functions tsc / build | Unit tests | Rules | Functions |
   |---|---|---|---|---|---|
   | (baseline `77ff49029`) | | 0 / 0 / clean | 10,314 | 210 | 55 |
   | `fix/ai-spend-guard-v1` (fast-forward) | `d4207096e` | 0 / 0 / clean | 10,331 | 214 | 76 |
   | `fix/deps-v1` (with `npm ci` from the new lockfiles) | `fefd84bf5` | 0 / 0 / clean | 10,407 | 214 | 76 |
   | `fix/timeline-writer-v1` | `8069e3396` | 0 / 0 / clean | 10,428 | 214 | 76 |

   - There were no conflicts.
   - `main` was pushed to origin (`7e0e9aeec..8069e3396`), and the primary checkout's local `main` was fast-forwarded. None of the 78 files other sessions had left modified there was touched.
   - The merge was done in a detached throwaway worktree. In that worktree, the deps merge commit's message was reworded from "into HEAD" with `--amend`, before anything was pushed and on a commit no other session held.
   - **The primary checkout's `node_modules` still predates the deps upgrade (xlsx 0.18.5).** It needs an `npm ci`. I didn't run one there, because other sessions share that checkout.
2. **Dev is no longer what the brief said.** It serves `index-WICYce58.js`, from `dev/qc153-tl1-ww2` @ `deff83314`, not `…-aisg1` / `index-GtyhzUwl.js`.
3. **Dev's line has no `TodoTray.tsx` and no bulk close.** Its To-do page is the v12 workspace, which closes one query at a time through `todo/ws/wsFlows.tsx`. The bulk close this pack fixes exists only on `main`.
4. **The dev deploy did not happen.** Nick's message said "Don't deploy anything", and the deploy command was refused when tried. See §5.

## 2. Step 0

- **Item 2: `restoreSnapshot` was one write at a time.** It ran a `deleteDoc` loop, then a `setDoc` loop. Confirmed.
  - **Callers on `main`, 4 sites:**

    | Caller | What its Undo puts back |
    |---|---|
    | `QueryDrawer.tsx:240` | every drawer journey's save (the receipt path also reaches `TodoTray` `onSaved`) |
    | `Queries.tsx:1772` | a timeline entry delete |
    | `Queries.tsx:1902` | a whole-query delete |
    | `TodoTray.tsx:905` | bulk close |

  - **Callers on dev's line, 15 sites**, the same function. Extra callers include `Queries.tsx` ×7, `ContactLogFlow`, `PasteEmailFlow`, `EditQueryPhone` and `wsFlows`.
  - **Largest snapshot seen:** 358 documents. That is the whole of `seed-ms-1` on the harness account (`tests/emulator-seed/harness.json`), which is what an accepted-offer snapshot holds. A single query tops out at 60 (`seed-cal-bang-q`).
  - **The batch limit applies to the restore plan, not the snapshot**, and plans are far smaller. The widest is a "Signed" undo, at about 3 writes per other live query: roughly 120 for `seed-ms-1`'s 39 live queries. A book needs about 165 live queries before it passes 500. That edge is refused cleanly (§4) rather than chunked.
- **Item 3: bulk close counted any throw as failed and pushed no undo.** That covers throws from `takeSnapshot` as well as `saveClose`. Confirmed.
- **Item 4: what `saveClose` writes, in order.**
  1. `recordQueryResponse` reads the log (`monotonicEventTime`).
  2. `updateDoc` of the query's response details (`closingReason`, `closingNotes`, …).
  3. `setDoc` of the closing rung in `queries/{id}/activity`.
  4. `recomputeQuery`. This is the write that makes the query *read* closed (status No Response or Withdrawn).
  5. The feed row in `activities`. This is best effort: it is caught and cannot throw.
  6. `saveClose`'s own follow-up `updateQuery`: `nudgeDate` / `closePlan` deleted, plus `withdrawTold` or `agentRecheckOn`.

  It can throw after the close has landed: step 6 is uncaught, and a step-4 failure leaves the log closed and the status not. There are no package stamps or task-flag writes in this path.
- **Item 5: `undoQueryStatus` is not a one-at-a-time path.** Its two deletes go through `removeActivityEverywhere` in one batch, then `recompute`, which is a derivation. It is not part of Phase 1. (It does swallow its own errors, so a failed one reports nothing. Noted, not changed.)
- **Item 6: the To-do page's nudge Undo found the nudge through the feed.** There are two sites, `useTaskCommit.tsx:139` and `:270`. Each takes the newest "Nudge sent" row in `activities` and calls `deleteActivity`. With the feed twin missing, it either found nothing or, worse, found the **previous** nudge and removed that one. `logNudge` returns `activityId` and `prior`. Confirmed.
- **Item 7: other one-at-a-time multi-document undos.** These are listed, not fixed (none goes through `restoreSnapshot`):

  | Undo | How it writes today |
  |---|---|
  | `restoreAgentSnapshot` (agent card) | delete and set loops |
  | `recordHoldingReply`'s undo | two deletes |
  | `recordQueryResponse`'s undo | `Promise.all` of up to 4 writes |
  | `scoutStore.undoAdd` | 3 writes in sequence |
  | Queries desk mark-sent / nudge / snooze / stop-nudging / create / correction undos | in sequence |
  | `usePackagesModel` create / retire / delete undos | 2 writes each |
  | `commitRecordSweep` | `updateQuery` per query |
  | `TodoTray` `putBack` | `Promise.all` of task flags |
  | `snoozeGroupWrites` and ToDoPage group snooze / hide | fire-and-forget |
  | `AgentCardHost` lab undo | lab only |

  Two more do go through `restoreSnapshot`, and Phase 1 makes each query in them all-or-nothing: bulk close's Undo across N queries, and the drawer's `restoreSnapshot` followed by `reconcileStamps`, a stamp derivation.

## 3. The approach for Phase 2

I took the read-back approach, not a single batch inside `saveClose`. The close goes through `recordQueryResponse`, the app's one response path, and its recompute reads the log it has just written. Making that one batch would mean a second response path beside it.

When the save throws, `closeOne` (`lib/queryActions/bulkClose.ts`) reads the query back:

| What the read-back finds | Counted as | Undo |
|---|---|---|
| The query reads closed | closed; logged "close landed, follow-up failed" | pushed, from the snapshot taken before |
| Something was written, but the query doesn't read closed | failed, after the snapshot is put back (all or nothing) | none needed |
| Nothing was written | failed | none needed |
| The read-back or the put-back fails | **unknown**, named in the message as "couldn't be checked" | kept |

The single Undo covers every query that closed or may have. Each query is put back whole, and one that fails to undo stays available and is named.

## 4. Phases

| Phase | Commit | Files | Tests added | Red first |
|---|---|---|---|---|
| 1 — one batch | `5c72dbbb5` | `snapshot.ts` (one `writeBatch`, `UndoFailedError`, the 500 guard, `readCurrent`); `UndoBar.tsx`; `TodoTray.tsx` (snapshot undos aren't marked spent until they land); `src/test/fakeFirestoreFull.ts` (new) | `snapshotRestore.test.ts`, 11 | Against the old body, 8 of 11 fail. Positions 2–5 leave a half-restored query; position 1 fails only on the error type. |
| 2 — bulk close reports reality | `2a8cde7e8` | `bulkClose.ts` (new), `TodoTray.tsx` | `bulkClose.test.ts`, 13 | Against today's catch-and-count-failed logic, 6 of 13 fail, including *throws after the close lands → counted closed, and its Undo reopens it*. |
| 3 — nudge Undo by row id | `ca9e26e83` | `nudgeUndo.ts` (new), `db.tsx` (adds the `undoNudge` context primitive only; `logNudge` untouched), `useTaskCommit.tsx` (both nudge Undos; `doneToast` now catches a failed undo), `todoFinishing.test.ts` (one source lock retargeted) | `nudgeUndo.test.ts`, 4 | The required case, *feed entry missing*, fails against a port of today's feed lookup, which removes the earlier nudge. The port's re-derivation of the nudge fields is approximate, so its other three reds aren't counted as evidence. |

On a failed undo, the message is "Couldn't undo that. Nothing was changed." and the same Undo is offered again.

- **Order inside the batch:** the old order is kept (created documents removed first, query documents written last). It no longer matters to listeners, because a batch reaches them as one change.

**Phase 4 gates vs baseline (`8069e3396` → `ca9e26e83`), read in full:**

| Gate | Baseline | After Phase 3 | Change |
|---|---|---|---|
| tsc | 0 | 0 | |
| functions tsc | 0 | 0 | |
| Build | clean (0 errors/warnings) | clean (0) | |
| Unit tests | 10,428 | 10,456 | +28 new, 0 failed |
| Rules | 214 | 214 | |
| Functions | 76 | 76 | |

**Every `restoreSnapshot` caller is now all-or-nothing per query.** The function itself is one batch, so all 4 callers on `main` and all 15 on dev's line get it with no caller change. Bulk close's Undo is one batch per query, and a query that fails is named.

## 5. Dev

- `dev/qc153-tl1-ww2-undo1` is a local branch: the three phase commits cherry-picked onto what dev serves (`deff83314`), with `TodoTray.tsx` left deleted as dev has it.
- Gates on that branch:
  - tsc is clean, but only with `--max-old-space-size=8192`. On Node's default heap it runs out of memory on dev's larger line.
  - Build is clean.
  - Rules: 251. Functions: 82.
  - 11,556 unit tests pass; **3 fail**, in `emuGuard.test.ts` and `firestoreTarget.test.ts`. They are census locks over `tests/e2e/` scripts on dev's line, and my commits touch nothing under `tests/`.
- `npm run build:dev` produced `index-CyTap7_q.js`, but **it was not deployed**. Nick's instruction ("Don't deploy anything") covers it, and the deploy command was refused.
- **None of the three hand checks was done**, and nothing was written to dev, so there is nothing to tidy up.
- When a deploy is wanted, the hand check "bulk close 2–3 queries from the To-do page" **cannot be done on dev's page**, which has no bulk close. It needs `main`'s To-do tray served somewhere, or is covered by `bulkClose.test.ts` only.

## 6. Deferred, with owners

- **Deploy `dev/qc153-tl1-ww2-undo1` and run the drawer and nudge hand checks.** Owner: Nick to say go; then a Claude session.
- **Merge `fix/undo-bulk-close-v1` into `main` and push.** Owner: Nick to say go.
- **`npm ci` in the primary checkout after the deps merge.** Owner: Nick, or the next session that has the checkout to itself.
- **The item-7 undos (§2): make each one batch.** Owner: a follow-up pack (Nick to schedule). `restoreAgentSnapshot` and `recordQueryResponse`'s undo are the two with the most documents.
- **Dev's single close in `wsFlows` has the same throw-after-landing gap Phase 2 fixed for bulk close.** Owner: a follow-up on the dev line.
- **`undoQueryStatus` swallows its own errors**, so its Undo can't say it failed. Owner: the same follow-up pack.
- **Dev's line needs more Node heap for tsc**, and has 3 red census locks that predate this pack. Owner: the dev-line owner.
