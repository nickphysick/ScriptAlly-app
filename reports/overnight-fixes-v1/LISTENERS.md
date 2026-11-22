# "Listen-channel overflow": the cause (Part 6, investigation only)

No app code was changed for this part.

**In three sentences.**
- The run that overflowed has already been diagnosed: the qc1522 session's `reports/qc-v152-2/emulator-log-diagnosis.md`, 6–7 November.
  - It found a harness fault: the emulator keeps finished Playwright pages' Listen channels open, about 130 by the end of a suite.
  - Each of those channels then fills to 10,001 pending messages from the next test's seed writes.
- Tonight's measurement (below) confirms that one page left alone does not grow.
- The code audit did find three real leak shapes in the app. All three need a sign-in, sign-out or Undo race to fire, so they are small for real writers.

## 1. Every listener

There are 34 grep hits for `onSnapshot(`. Five of them are `versionSnapshot(` (`bookVersions.ts:757/788/797/803`, `VersionsV2Page.tsx:122`), which a substring match picks up. That leaves **29 real listeners**.

The Firestore SDK shares one watch target between identical queries. So a listener duplicated across pages costs SDK listeners, not server targets.

| file:line (this branch) | listens to | unsubscribe | mounted by | flags |
|---|---|---|---|---|
| db.tsx `unsubUser` | users/{uid} | sign-out list; effect cleanup | the provider's onAuthStateChanged effect (deps `[]`) | (a) async gap |
| db.tsx `unsubEntitlement` | users/{uid}/private/entitlement | the same | provider | (a) |
| db.tsx `subManuscripts` | …/manuscripts | the previous one first, then sign-out and cleanup | provider; re-run by "Try again" (Part 2) | (a) async gap only |
| db.tsx `unsubVersions` | …/versions | sign-out, cleanup | provider | (a) |
| db.tsx `unsubAttachments` | …/attachments | sign-out (called twice, harmless), cleanup | provider | (a) |
| db.tsx `unsubPackages` | …/packages | sign-out, cleanup | provider | (a) |
| db.tsx `subAgents` | …/agents | the previous one first, then sign-out and cleanup | provider; retry | (a) async gap only |
| db.tsx `subQueries` | …/queries | the previous one first, then sign-out and cleanup | provider; retry (Part 2) | (a) async gap only |
| db.tsx `unsubActivities` | …/activities | sign-out, cleanup | provider | (a) |
| db.tsx `unsubJournal` | …/journalEntries | sign-out, cleanup | provider | (a) |
| db.tsx `unsubNotes` | …/notes | sign-out, cleanup | provider | (a) |
| **db.tsx `unsubUserTasks`** | …/tasks | **not called on sign-out**; cleanup only | provider | **(a)** |
| db.tsx `unsubDismissed` | …/dismissedTasks | sign-out, cleanup | provider | (a) |
| db.tsx `unsubTaskFlags` | …/taskFlags | sign-out, cleanup | provider | (a) |
| EditQueryDrawer.tsx:142 | …/queries/{id}/activity | effect return | one drawer (EditQueryHost) | (c), one at a time |
| Queries.tsx ~2118 | …/queries/{selectedQueryId} | `unsubscribeRef`; cleanup | Queries (kept alive) | (a), see #2 |
| Queries.tsx ~2147 | …/queries/{selectedQueryId}/activity | effect return | Queries | (d) same path as the drawer, dock and query log |
| **Queries.tsx ~2214** | …/queries/{queryId} (handleUndo's resubscribe) | assigned to `unsubscribeRef.current` **without unsubscribing what is there** | an async click handler | **(a)** |
| EditQueryPhone.tsx:71 | …/queries/{id}/activity | returned | phone only, one at a time | (c) |
| useAgentNotes.ts:31 | …/agents/{id}/notes | returned | the open agent card | fine |
| useDockActivity.ts:53 | …/queries/{id}/activity | returned | To-do (kept alive) | (d) |
| WsPreview.tsx:50 | …/queries/{id}/activity | returned | TodoWorkspace (two at a time), phone | (d) |
| foundingNotes.ts:71 | betaFeedback where uid== | guarded | no callers (dead code) | — |
| foundingStats.ts:95 | foundingStats/{uid} | guarded | Dashboard (kept alive), Your notes, Feedback dock | (d) |
| importDraft.ts:80 | importDrafts/{uid} | returned; the caller guards with `live` | Dashboard | fine |
| scoutStore.ts:74 / :79 | …/scoutDecisions, …/scoutShares | combined | Discover (kept alive) | fine |
| yourNotesStore.ts:32 | betaFeedback where uid== | guarded | AppShell (always) and Your notes | (d) |
| yourNotesStore.ts:66 | betaFeedback/{noteId}/thread | guarded | one note panel | fine |

Flags: (a) no unsubscribe on some path; (b) an effect whose dependencies change often (none found); (c) one per row, card or drawer; (d) duplicated across kept-alive pages.

## 2. Measurements

The measurement is `tests/e2e/onfListeners.measure.ts` on the emulator, signed in as the harness account, recorded by `tests/e2e/listenTally.ts`. All readings are in `listeners.json`.

| moment | Listen opens | targets added | removed | **open** |
|---|---|---|---|---|
| 1 · after load (/queries) | 3 | 24 | 5 | **19** |
| 2 · after 13 workspace pages | 3 | 24 | 5 | **19** |
| 3 · after the query panel ×20 | — | — | — | not measured: 0 of 20 panels opened |
| 4 · after the agent card ×20 (20 opened) | 3 | 44 | 25 | **19** |
| 5 · idle 1, 2, 3, 4 and 5 min | 3 | 44 | 25 | **19** at every sample |

- **Flat.** No count rises.
- Each card open added one `users/*/agents/*/notes` target (20 in all), and each close removed it.
- Visiting every kept-alive page added no target: they read the provider's 14 listeners.
- Step 3 failed for a selector reason. The cycle clicked `[data-qc151='row']`, the old table's rows; the v156 list's rows are `[data-qcv='row']`, as the Part 7 probe found later.
  - The 7 November tally covers the same ground: every card's listeners are removed when the card closes (`reports/qc-v152-2/listen-suite.jsonl`).

## 3. Where the 11 November run hit it, and whether this explains it

**Where it hit:** the emulator disk guard (`scripts/emu-guard.mjs`) and the qc1522 session's diagnosis (`reports/qc-v152-2/emulator-log-diagnosis.md`, with `listen-idle.json` and `listen-suite.jsonl`).
- The suite left about 130 Listen channels open on the emulator after Playwright closed their pages.
- The seed before each test took 1.1 s at the first test and 96.5 s at the last.
- Every later write fanned out to every dead channel, and each channel overflowed at 10,001 pending messages.

**Whether tonight's measurement explains it:** it does not point at an app loop. One page, kept open, does not grow (§2). The overflow is the harness's many pages, one after another, on one emulator.

## 4. The most likely cause, and the app leaks the audit found

1. **The emulator run (the overflow itself): the harness.**
   - Closed test pages' channels stay open on the emulator, and each test signs in again.
   - The app's per-load cost is about 23 targets (the 14 provider listeners plus the user and entitlement docs), times 130 pages.
2. **App leak A, `db.tsx` onAuthStateChanged.** This one could also feed the harness fault.
   - The callback `await`s `getDoc` (and maybe `setDoc`) before it subscribes, with no "still current?" guard.
   - If sign-out or the effect cleanup lands in that gap, the cleanup calls the old no-op unsubscribes. The callback then subscribes all 14, and nothing ever closes them.
   - React StrictMode (main.tsx) runs effect cleanup once in dev, so dev and the emulator hit this on every load. Production does not double-mount.
   - The 11 assignments outside the sub-functions also overwrite without unsubscribing, so a second non-null auth event for the same session leaks a whole set.
3. **App leak B, `Queries.tsx` handleUndo.**
   - The resubscribe after `await undoFn()` overwrites `unsubscribeRef.current` without closing the listener already there.
   - A selection change during the await, or a double-clicked Undo, leaks one document listener. The page is kept alive, so these add up over a session.
4. **App leak C, sign-out misses `unsubUserTasks()`** (the sign-out list has `unsubAttachments()` twice instead). That is one tasks listener per sign-out and sign-in cycle.

**Would real writers hit it, and what does it cost?**
- Production has no StrictMode double-mount, and writers rarely sign out and back in within one tab.
- So leak A is rare. When it does fire, it costs one set of 14 live listeners: every change to those collections is read twice from then on, roughly doubling the account's live reads until the tab closes.
- B costs one document listener per raced Undo: one extra read each time that query changes.
- C costs one tasks listener per sign-out and sign-in.
- None of these is the October bill (reports/firestore-bill/REPORT.md puts that on tooling).

## 5. The proposed fix, sized

- **Small (app, about 30 lines in db.tsx and Queries.tsx):**
  - In the auth callback, read a generation number before the await and return if it changed.
  - Call every unsubscribe before re-subscribing, and add `unsubUserTasks()` to sign-out.
  - In handleUndo, unsubscribe the current ref before assigning, and drop the resubscribe if the selection has moved.
  - Lock each with a source test, plus a StrictMode render test that counts `onSnapshot` calls against unsubscribes.
- **Medium (harness):** close each test's page with `page.close()` plus `context.close()` (and check that the emulator sees the channel close), or give each spec file its own emulator. The guard's watchdog already limits the damage to disk.

## 6. What I could not measure

- Server-side open targets: the emulator's own count. The browser-side count is a proxy.
- Whether Auth here ever emits two non-null events without a null between them.
- How often Undo overlaps a selection change in real use.
