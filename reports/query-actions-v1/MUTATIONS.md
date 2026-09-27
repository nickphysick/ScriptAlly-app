# Query actions v1 — mutation proof (27 Sep)

Worktree `/Users/nickphysick/ScriptAlly-qa`, preview `http://127.0.0.1:4611` (dev build, rebuilt with `npm run build:dev` after every mutation and once more after the last restore). Each mutation was applied alone, backed up first to a path-derived name in `/Users/nickphysick/qa-logs/mut/`, and restored with `cp` + `cmp`. Run logs: `/Users/nickphysick/qa-logs/mut/run*.log`.

The account was snapshotted before the writing mutations (837 docs across queries, activity, activities, taskFlags, tasks and dismissedTasks; `acct-base.json`). After each writing run it was diffed against that snapshot and repaired to it (`acct.mjs`).

| # | File | Mutation | Lock / command | Result |
|---|------|----------|----------------|--------|
| 1 | `src/components/queryActions/DrawerShell.tsx` | `primaryDisabled = (…) \|\| view.steps.some(s => s.guard?.level === "check")` | e2e `qaLocks -g H2` | **RED**: "a check disabled Next" |
| 2 | `src/lib/queryActions/dates.ts` | `offWeekend = (d) => d` | unit `queryActions.test.ts` | **RED** (2 cases): "expected 6 to be 1"; "reminder anchors never land on a weekend … expected true to be false" |
| 2 | same | same | e2e `qaLocks -g H5` | **RED**: "a reminder chip lands on a weekend: 22 Nov". ⚠️ Depends on the date: it fired because today (Sun 27 Sep) + 56 days is a Sunday. On another day H5 could pass under this mutation, so the unit test is the reliable lock. |
| 3 | `src/lib/queryActions/restorePlan.ts` | deleted the `remove.push` loop (undo no longer deletes created docs) | unit `queryActions.test.ts` | **RED**: "expected [] to deeply equal ['users/u/activities/a2', …]" |
| 3 | same | same | e2e `qaJourneys -g D2` | **RED**: "undo left the account different from before", with two `added` paths (`cor-move-b` activity + feed row). **Residue: 2 docs, removed.** |
| 4 | `src/components/queryActions/journeys/ResponseJourney.tsx` | `if (closedNoReply && false)` (No Response rungs never deleted) | e2e `qaJourneys -g "D2 — record"` | **RED**: "the no-reply ending is replaced, not appended to — still there: …/msv12-q-8/activity/act-status-no-response-msv12-q-8". Undo restored everything; no residue. |
| 5a | `…/journeys/OfferJourney.tsx` | `for (const o of others)` (all 44 live queries withdrawn, ticks ignored) | e2e `qaJourneys -g "D6 — accept"` | **RED, but for the wrong reason**: `[data-qad-toast="on"]` not visible within 20s, because 44 withdrawals took longer than that. The failure came before `saveAndUndo`'s try/finally, so **the undo never ran. Residue: 70 docs added, 45 query docs changed, all repaired to the snapshot.** |
| 5b | same | `for (const o of [...wd, one unticked])` | e2e `qaJourneys -g "D6 — accept"` | **RED**: "an UNTICKED query was withdrawn: cor-move-b Withdrawn". Undo exact; no residue. |
| 6a | `…/journeys/NudgeJourney.tsx` | the nudge commit also writes `taskFlags/mut6__q_<qid>` with `queryId` | e2e `qaJourneys -g "D4 — nudge sent"` | **RED**: "the drawer wrote no task flag (H8)". The snapshot covers taskFlags by `queryId`, so undo removed it; no residue. |
| 6b | same | the nudge commit also writes a stored **UserTask** `tasks/mut6b-<qid>` (`queryId` set, valid under rules) | e2e `qaJourneys -g "D4 — nudge sent"` | **GREEN, a gap.** No lock catches it, and **undo does not remove it**: the snapshot reads queries/activity/activities/taskFlags but not `tasks`. **Residue: 1 task, removed.** The full unit suite (8,207 tests) run under 6b also stayed green on this point (its 3 reds were load timeouts that pass alone). |
| 7 | `src/components/dashboard/OneScreenTasks.tsx` | in the drawer-door branch, a dynamic-import `updateDoc(query, { nudgeDate })` before `openQueryDrawer` | e2e `qaLocks -g H9` | **RED**: "the tick wrote something — only the drawer may write". **Residue: `msv12-q-4` gained `nudgeDate`, restored.** |
| 8 | `…/journeys/LogJourney.tsx` | dropped `sentMaterials` and `sentVersions` from the payload (only `sentPackageId` stored) | e2e `qaSnapshot -g H11` | **RED**: `expect(String(sent.sentMaterials)).toContain("Autumn round")`, received "undefined". Finally-undo ran; no residue. ⚠️ Only H11's "was written" half was reddened. The rename-survival half can't be reached by any app-side writer, because the test renames from node. It would catch only a live listener that rewrites queries. |
| 9 | `src/components/queryActions/queryDrawer.css` | removed `transform: none;` from the reduced-motion `.qad-drawer, .qad-root.is-open .qad-drawer` rule | e2e `qaLocks -g H7` | **GREEN, an equivalent mutant.** Line 46 (`.qad-root.is-open .qad-drawer { transform: none; … }`) already sets the open state to `transform: none`, and `transition-property: opacity !important` still stops the slide. The mutated page behaves the same when open, so the lock is right not to fire. |
| 9b | same | removed `transform: none` **and** `transition-property: opacity !important` from that rule | e2e `qaLocks -g H7` (run twice) | **RED**: "the drawer is transformed under reduced motion: matrix(1, 0, 0, 1, 510, 0)" |

## Findings
1. **6b is a real gap.** A journey that writes a stored UserTask (`users/{uid}/tasks`) is caught by no lock, and the drawer's Undo leaves it behind because `snapshot.ts readSet` does not read `tasks`. D4 only counts `taskFlags` by `queryId`. H9's fingerprint counts taskFlags and the feed, but not tasks. The cheapest guard would be to count `tasks` in D4/H9 (and in `accountFingerprint`).
2. **5a exposes a harness hazard.** `saveAndUndo` only protects against failures inside `onSaved`. A save that does not produce its toast within 20s fails before the try block, and the account is left changed. Under a slow or large save that is 115 documents of residue.
3. **H5's weekend check is date-dependent.** It went red today because today+56 is a Sunday. The unit test is the lock that always holds.
4. **H11's rename half cannot be reddened by an app code path.** Only its "snapshot was written" half is proved.
5. **Mutation 9 as specified is a no-op.** 9b proves H7 does catch a real reduced-motion transform.

## Restoration
All 9 backups `cmp` equal to their files at the end. No `MUTATION` marker remains in `src/`. `dist/` was rebuilt clean with `npm run build:dev`. The account diff against the pre-run snapshot is `{added: [], changed: [], removed: []}`.

## After the run — the 6b gap closed and re-proved

- `snapshot.ts readSet` now reads `users/{uid}/tasks` where `queryId` is in the set, beside the task flags. A stored task that appears between the snapshot and the Undo is therefore removed by the Undo.
- The journey file's own `readSet` (the byte-identical undo check) reads `taskFlags` and `tasks`, so every journey covers it, not only D4. `flagsFor` counts both, and its message reads "no task flag and no stored task (H8)". H9's `accountFingerprint` adds the `tasks` count.
- **6b re-run** (a valid UserTask written by the nudge commit): **RED**, "the drawer wrote no task flag and no stored task (H8)". The account diff against the pre-run baseline is empty afterwards: the widened snapshot's Undo took the mutant task away.
- ⚠️ **The first re-run was red for the wrong reason.** Its task omitted `updatedAt`, so the rules refused the write, the save threw after writing the nudge rows, no toast appeared, and the undo never ran. That left 2 rows and 1 query change on `cor-move-b`, repaired to the baseline with `acct.mjs repair`. This is the same shape as 5a.
- **5a hazard:** `saveAndUndo`'s toast wait went from 20s to 90s. A save that cannot produce its toast still skips the undo; that case is left recorded rather than engineered away.
