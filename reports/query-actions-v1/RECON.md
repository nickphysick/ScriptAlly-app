# Query actions v1 — recon (§0)

Base: `origin/main` @ `c7cfa417`, worktree `/Users/nickphysick/ScriptAlly-qa`. Reference `design-refs/query-actions-v11.html`, SHA256 `e5d48ded…0672` — **matches**; enrolled in `design-refs/.refhashes.json`. The mock's full build spec (resolved CSS, DOM, every journey's logic and copy, verbatim) is `reports/query-actions-v1/MOCK-SPEC.md`; the quill is extracted to `quill.webp` (316×400, real alpha, 25.8KB).

**Baseline gates** (before any edit): tsc 0 · `vite build` 0, no CSS diagnostics · Vitest **500 files / 8,262 tests (3 skipped), 0 failed** — once `functions/node_modules` is linked into the worktree (without it `functions/src/email.test.ts` cannot resolve `firebase-functions/params`: a worktree artefact, not a red).

## 1. Every flow this replaces

Names in the brief that no longer exist: `LogQueryFocusForm` and `QuerySlideInPanel` (retired for `EditQueryDrawer`/`EditQueryHost`); "Queries hub create mode" is `QueryPanel mode="form"` + `QueryLogSheet` in `Queries.tsx`.

| Flow | Entry points | Writes | Tests |
|---|---|---|---|
| Create (`openCreate`, Queries.tsx:608 → `saveCreate` :1201) | App's "Log query" interception seed, `#/queries/new?agent=`, the Log button (:5743) | `addQuery(draftToPayload)` + journal note; undo `undoCreate` → `deleteQuery` | queryLogSheet, queryCentrePane, createUndo, queryDraft, createQty, datePickerHub, queryCentreMoment; e2e qcChassis, journeys |
| RespondDesk → `saveDeskResponse` (:791) | QcOpenCard `onPrimary`/`onAction` (:5086–5103), QueryPanel (:6626), `handleRowVerb` (:1734), QueryTimeline nudge (:5019) | `recordQueryResponse`; undo = its own | respondDesk, responseJourneys, queryAmbient, expectedDate, queryVersions; e2e drawer3, qcV65, deskPaint* |
| MarkSentDesk → `saveDeskMarkSent` (:833) | as above | `markSentWithReceipt` (= `recordMaterialsSent`); undo `deleteActivities` + restore prior fields | as above |
| NudgeDesk → `saveDeskNudge` (:887) | as above | copies `nudgeDraft` text to the clipboard (**ruling 1 breach**), `logNudge` (writes a **task flag**); undo `deleteActivities` + restore | as above |
| MarkClosedDesk → `commitClose` (:935) | as above, QuickActionPopover close reasons | `recordQueryResponse` (rejected / close + `closingReason`) | as above |
| Record takeover `openRecord` → `saveResponse` (:722) | offer turn, RespondDesk `onOffer`, buttons :6796/:8510 | `recordHoldingReply` / `recordQueryResponse` | as above |
| QuickActionPopover | QcOpenCard ⋯, row verb | quick snooze (`nudgeDate` + `dismissTask`), stop nudging (`dismissTask`), close | respondDesk |
| Correction UI (`CorrectionFork/Edit/MoveSheet`) | QueryTimeline edit clicks, `onEditEntry`/`onDeleteEntry` | `editActivity`, `deleteActivities`, `moveActivity`; undo guarded by `undoStillValid` | correctionDesk, queryPanel, correctionUndo/Guards/Move/Preview, queryCentreCorrections, activityStores; e2e qcCorrectionUndo, qcMove, moveEntry, moveDest, diffList |
| RecordResponseFocusForm (live, Queries.tsx:8599) | `openRichForm` (:1416), correction fork `onAppend` | raw `deleteDoc` of SUB rungs (**skips FEED twins**) then `recordQueryResponse`; **no undo** | offerDecision |
| RecordResponseScreen (App.tsx:856) | the rail's "Record a response" | `recordQueryResponse`; **no undo** | queriesMobile, recordResponseShell |
| RecordResponseModal | **dead** in both hosts (Queries.tsx:8554, Dashboard.tsx:1675) | — | none |
| NudgeModal | Queries.tsx:8799 (bird's-eye + mobile); Dashboard host dead | `logNudge`, **no undo**; renders `nudgeDraft` | respondDesk, nudgeDraft |
| Mobile ⋯ "Close this query as…" (:8528) | mobile sheet | bare `updateQueryStatus`, **no undo** | — |
| EditQueryDrawer (App.tsx:681) | mobile Edit, EditAgentHost | `commitQueryEdits`; **no undo** | packageLock, queryStatusWriters, expectedDate, queryPanel |
| TaskModal (dashboard `OneScreenTasks`:558, Manuscripts v12 `ManuscriptPage`:400) | task ticks, feed "Send it →" | via `DashTaskCommit` → `useTaskCommit` / `updateQueryStatus` / `logNudge` | oneScreenTasks, msv12Smoke, motionPolish; e2e manuscriptsV12 |
| To-do `TaskPane` → `useTaskPaneSession` → `commitFromPane` | To-do page cards | `useTaskCommit`: `recordMaterialsSent` (duplicate-send guard), `logNudge`, `updateQueryStatus`, `recordOfferDecision` (**no undo**), materials | paneCommit, paneWrite, paneJourney, paneGate, … (see flows list) |
| FocusFlow (ToDoPage:2371 only; Calendar no longer mounts it) | hand-offs, group sweep, weekly review | staged `recordMaterialsSent`/`logNudge`/`dismissTask`/`updateQueryStatus` — **no undo** | todoWorkbench, todoSession, … |
| Dashboard feed | `OneScreenFeed` "Send it →" → `openModal(row,{fromFeed})` | nothing itself | dashFeed, feedSentence |

**Retirement plan:** each entry point switches to `openQueryDrawer(…)` **only when its journey is green** (brief §I), so no writer loses a way to record something mid-run. Tier 1 switches: the Query Centre's Log button + the create seed (D1), QcOpenCard's primary + row verbs for responses and sends (D2/D3), and the dashboard/to-do send tasks (D3).

## 2. Data model — §G onto the existing fields

| §G | Field | New? |
|---|---|---|
| package + versions sent (snapshot, P4) | `packageId` (existing, required) + **`sentPackageId`**, **`sentMaterials`** (readable string), **`sentVersions`** (string[]) — flat, repeated in the Activity `details` | new ×3 |
| requery flag | **`requery: bool`** | new |
| stored request (sample + synopsis) + date | `materialsRequestedType`/`materialsRequestedQuantity` (existing) + **`requestFrom`**, **`requestFromUnit`**, **`requestSynopsis`**; date = `partialRequestedDate` (derived) | new ×3 |
| `sendBy` | `expectedSendDate` (existing, written by `recordQueryResponse`) + `sendReminderDate` (existing) | reuse |
| last materials sent (label + date) | the `MATERIALS_SENT` rung (derived `partialSentDate`/`fullSentDate`) + **`lastSentLabel`** | new ×1 |
| reply window | `writerExpectedDate` (existing, the writer's stated date; unset = the agency's window) | reuse |
| `nudgePlan` | `nudgeDate` (existing — "the field made for it", K4) | reuse |
| `closePlan` | **`closePlan`** (ISO) | new |
| `closeReason` | `closingReason` (existing token) extended with **`offer_declined`**, **`accepted_offer`**, **`agent_closed`** | reuse (values) |
| offer on / by | `offerDate`, `offerResponseDeadline` (existing) | reuse |
| the others | **`offerRefQueryId`**, **`offerTold`**, **`offerReply`**, **`offerToldOn`** — flat, on each OTHER query | new ×4 |
| the call | **`offerCall`** (`none`/`booked`/`done`), **`offerCallOn`** | new ×2 |
| statuses | **`Signed`**, **`Resubmitted`** added to `QueryStatus` | new ×2 |
| no-reply-means-no override | **`nrmnOverride: bool`** (absent = the agent's guidelines) | new |
| Activity | **`eventKey`** on both stores | new |

Undo: see `src/lib/queryActions/snapshot.ts` — every save snapshots the query docs, their SUB logs and their FEED rows first; undo diffs and puts back (delete created, rewrite changed/removed). The existing per-writer undos are inconsistent (the recon found seven write paths with none, and `undoQueryStatus` leaving `writerExpectedDate`/`nudgeDate` behind); a snapshot cannot drift from its writers.

## 3. Submission packages (from the packages session, P1)

`SubmissionPackage`: `queryLetterVersionId` (required), `synopsisVersionId` (`""` = none), `samplePagesVersionId` (always `""` now), optional `bookVersionId` (from `Manuscript.bookVersions`), `otherMaterials` (≤512), `note`/`noteEditedAt`, `firstSentAt` (the lock), `status` Active/Retired. "Used for new queries" = `Manuscript.activePackageId` (after tonight's change, **absent** = none). Letters and synopses live in `users/{uid}/versions`. A query records `packageId` only; sample size lives nowhere on the package — so the adapter derives a package's sample from nothing and the drawer's sample control stays the writer's own. **The model is not changing tonight.**

## 4. Agents

`responseTimeWeeks?` (absent = not stated), `noResponseMeansNo?`, `submissionMethod` (`Email`/`Online Form`/`Query Manager`/`Post`), `materialsWanted: string[]` (free strings, parsed by `lib/agentMaterials.ts`). **Agency is free text** — the same-agency check compares normalised strings (trimmed, case-folded).

## 5. Reminders and to-dos

Tasks are derived in `db.tsx` `calculatedTasks` (:881); reply-side precedence in `lib/taskPrecedence.ts` `replyTask`. `nudgeDate` = the writer's planned nudge; `lastNudgeSentDate` = last nudge. Dismissal = `taskFlags` (`dismissedTasks` is legacy, backfill-only). `logNudge` writes a task flag — **the drawer does not use it** (H8); it writes the nudge rows and fields itself and the "Consider closing" date is `closePlan`, which `replyTask` now reads.

## 6. Overlays

Shared right drawer `components/shared/SlideOver.tsx` (scrim closes). `useOverlay.ts` holds the recorded scrim decision:
> "FocusFlow's backdrop click NUDGES the sheet (it holds a staged model that a stray click must not discard); TaskSettingsSheet's CLOSES (every switch has already been written, so there is nothing to lose)."

`todoCalendar.css:1720`: "clicking the scrim never closes, because the pane holds answers the writer has typed". **The drawer follows it**: with answers held, a scrim click shakes the drawer; empty, it closes. File that owns the drawer: `src/components/queryActions/QueryDrawer.tsx`, mounted once by `App.tsx`.

## 7. Tasks

Emitted types: `offer_received`, `partial_requested`, `full_requested`, `revise_resubmit`, `no_response_close` (reason `no-reply`), `nudge_overdue` (reasons `nudge-first`/`nudge-again`), `materials_unrecorded(_bulk)`, `querying_unstarted`, `dream_agent_unqueried`, `data_quality_poor`. `response_overdue` (brief K3) **does not exist** — noted, not invented. Suppression: `isFlagSuppressing` over `taskFlags`. `useTaskCommit` carries the duplicate-send guard `priorSameTypeSend`; D1's "already live" block and D3's send reuse the same guard module.

## 8. The feed

`activityEvent.ts` `activityEventLabel` is typed (activityType + resultingStatus). `activityUtils.getActivityKeyAndDefaults` still substring-matches `description` (and misses the stored R&R description "Revise & Resubmit request received…" — falls to "Status changed"); `extractAgentFromText`; `OFFER_RECEIVED_DESC_RE` in todoBoard; `dashFeed` for agent/manuscript rows and its fallback. `eventKey` is read first by the feed and timeline labellers, text matching only for older rows.

## 9. Rules

`isValidQuery` enumerates the ten statuses (`firestore.rules:423–434`); the query update allowlist is `:916–935`. Nested activity: `isValidActivityNested` `hasOnly([...14 keys])`, `type` not enum-checked, `resultingStatus` enum. Global `activities`: `activityType` enum (13), `resultingStatus` enum, update allowlist `:966`. **So `eventKey`, the two statuses and every new query field need rules — the §R set.** Rules tests: `tests/rules/firestore.rules.test.ts` via `npm run test:rules` (emulator).

## 10. The other session (P1)

Sent at start. Reply (Submission packages v2 session, 27 Sep): package model **unchanged** tonight, `types.ts` untouched; one uncommitted change landing — `setActivePackage(msId, "")` now deletes `activePackageId`. Shared files it will touch: `lib/db.tsx` (that one line), `CLAUDE.md` (a new section appended). Also: `tests/e2e/optedOut.ts`, `mastheadMatrix`, `illustratedMasthead` WITH_ART, `pageHeaderV2`, `workspacePageGrid.test.tsx` OPTED_OUT (4 → 5), and one rule in `shell/illustratedMasthead.css`. None are mine. It needs no rules. It will deploy dev hosting once, after its commit 3, and message first.
