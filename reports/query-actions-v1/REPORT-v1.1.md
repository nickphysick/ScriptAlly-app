# Query actions v1.1: the report

Attended follow-up to v1, run 28 Sep under the same standing rules.

- **Commits on `main`:**
  - `ab514740`: items 1, 2, 5 and 6
  - `4eae6e71`: item 3 (the helper's work, cherry-picked)
  - `f0a78c4d`: the v1.1 fixes, the locks and this report
  - `3422ac80`: CLAUDE.md
- **Deployed to dev** from a clean worktree of `3422ac80`, which includes the Contact list session's `5a9956aa`: **`index-BQFNYxFv.js` · `index-CmsyJ7TK.css`**, checked with curl. The packages and Contact list sessions were told first and both cleared it.

## Gates
- **tsc:** 0 errors.
- **Production `vite build`:** exit 0, no CSS diagnostics.
- **Vitest:** 498 files, 8,173 passed (3 skipped), 0 failed. v1 ended at 8,204; the difference is the tests of the deleted surfaces: TaskModal, the weekly review, FocusFlow's query sheets and RecordResponseScreen.
- **Rendered locks (local build):** **29 passed.** That is v1's 25 plus v1.1's new ones: delete-entry, first entry, picker, and mobile at 390 and 768. The account diff against the run's baseline is empty.
- **Rendered locks (deployed build, `SA_E2E_BASE_URL=dev`):** **31 passed, 0 failed**. The six files are qaV11, qaJourneys, qaLocks, qaSnapshot, queryActions and qaDeploySmoke; the last smokes the packages page. The account diff afterwards is empty. `/agents` rendered 37 rows with no page errors. The mobile screenshots below are from this run.

**Proved red** (in the measurement worktree; backups are path-derived; the account was repaired to its baseline after each):

| Mutation | The lock's message |
|---|---|
| The row never turns into the confirm | "the row did not turn into the inline confirm" |
| Undo restores nothing | "Undo left the account different" |
| The picker offers closed queries | "a closed query was offered: seed-pkgq-8" |
| The sheet breakpoint back to 767 | "768 log first: not full-screen {l: 268, r: 768 …}" |

## The six items

**1. Deleting a history entry.**
- **The confirm:** the row itself turns into the mock's ink confirm: "Delete “Nudge sent”? The status goes back to the entry before it." with Keep and Delete. Then the drawer's Undo bar: "Entry deleted · Agent" and "“NUDGE SENT” REMOVED · STATUS NOW …". Undo is by snapshot and puts every document back byte-identical.
- **The first entry** asks "Delete this whole query?" ("Its history and reminders go too.") and runs Delete query.
- **A request whose send answers it** is named and removed together with that send. The confirm reads "Delete “X” and “Y”?". This deviates from the mock: removing the request alone would leave the send stranded.
- **Delete is one choice from the ⋯.** The correction fork gains "It never happened" beside Correct, Append and Move. Move was kept: the mock's bare Edit · Delete would have dropped it.
- **Found and fixed:** the fork was stacked at `z-index: 71`, under the query modal (80). Since v65.6, ⋯ → correct / append / move could not be clicked from the one place a query opens. It is 81 now.
- **Also fixed:** the fork's "Something changed since" still opened the old `RecordResponseFocusForm`. It now opens the drawer's response journey.

**2. "Record a response" opens the drawer.**
- ⚠️ **Correction to v1's report:** there is no sidebar "Record a response" in the current shell; the rail captures went with the shell rebuild. The live control is the Query Centre header's secondary button. It, and every other caller, goes through App's `"Record a response"` interception, which now calls `openQueryDrawer({ mode: "resp" })`.
- **The picker:** with no query, the first step is "The query", an agent search over **live** queries only. Unresolved agents sort last. A pick remounts the response journey on that query. The picker view shows no review step and no primary button, and the phone bar reads "Choose the query".
- **Paste lane (your ruling):** Pro users get a "Paste the email instead" link that opens the existing `PasteEmailFlow`. Free users see no link. The harness account is free, so only the absence is measured.

**3. `TaskModal` is retired, the weekly review is deleted, and FocusFlow is renamed** (your ruling). Every file:
- **Deleted:**
  - `src/components/task/TaskModal.tsx`
  - `src/components/task/taskModal.css`
  - `src/lib/taskModal.ts`
  - `src/assets/todo/review-cup.svg`
  - `tests/e2e/cardJourneys.measure.ts`
  - `src/components/RecordResponseScreen.tsx`
  - `src/components/FadeScroll.tsx` (only the screen used it)
- **Renamed:**
  - `src/components/todo/FocusFlow.tsx` → `src/components/todo/HousekeepingSweep.tsx` (`FocusFlow` → `HousekeepingSweep`, `FocusItem` → `SweepItem`)
  - `src/lib/briefingSlot.test.ts` → `src/lib/todoRetiredSurfaces.test.ts`
- **Symbols deleted:**
  - `modalJourney`, `modalWhen`, `DashSnoozeInline`, `blankDraft`, `draftToValues`, `OWED_SEND_TASK_TYPES`
  - the review's `reviewWeek`, `weekReviewStats`, `reviewSeedCandidates`, `reviewCompletionSnooze` and `briefing*`
  - the `weekly_review` task type, the `sunday_review` setting, and `TodoPrefs.weeklyBriefing` with its Account-settings toggle
  - `statusOrder.EXPECTED_NEXT_STEPS`
- **"Start the sweep" is unchanged**, and a query card that reaches the sweep goes to the drawer first.
- **Stored data left in place:** `todoPrefs.weeklyBriefing` (dropped on the next preference save), `sunday_review` in `mutedTaskRules`, `weekly_review` task flags, and the `sa.todoReviewSeen` / `sa.todoReviewDismissed` localStorage keys. firestore.rules is untouched.
- **Still in the sweep, and yours to decide.** None of these is a query journey:
  1. `dqSheet`, one agent's missing data, reached from the pane's "Update the record" (writes `updateAgent`);
  2. `noteSheet`, crossing off a note (unreachable in practice);
  3. `handoffSheet`, where `agent_recheck` cards land (writes nothing, links to Submission packages).
- **Left for a sweep:** `RecordingCalendar` and `lib/recordingCalendar` no longer have a mount, and about 40 `.tdb-ff*` / `.tdb-jn*` rules lost their only renderer.

**4. `agent_recheck`** keeps the board's own route. The reason (it is about an agent, not a query) is now in CLAUDE.md.

**5. Mobile.**
- **Breakpoint:** the drawer is a full-screen sheet at **≤768px** (it was 767; at 768 it was a 500px drawer beside a 268px strip of dimmed page). The lock proves the old breakpoint red.
- **Result:** every journey's first step and review was measured at 390 × 844 and 768 × 1024, 17 screens each. Each is full-screen, carries "Step N of M" (the picker says "Choose the query"), and hides the desktop stepper. Nothing runs past the edge, nothing scrolls sideways, and no text is clipped.
- **Nothing needed fixing beyond the breakpoint and the picker's bar.**
- **The pale band down the right edge of a scrolling sheet** is Chromium's overlay scrollbar track in the headless run. It takes 0px (`offsetWidth − clientWidth = 0`), shows only where the body overflows, and nothing in the app paints it.

**6.** `.qrd-mail` (with its `.qrd-mh` children) is removed from `respondDesk.css`, and `.tdb-ffdraft` from `todo.css`. No emitter was found for either, including interpolated class names.

## Also changed
- `tests/e2e/openQuery.ts` looked for the v11 docked card. The open query moved to the rail in v65 and to the modal in v65.6, so every suite using the helper had been failing to open a query. It now tries the modal, the rail, then the page. This should also revive `deskBounds`, `deskPaint*`, `rungCrop`, `rungSweep` and `rungWidths`, which weren't re-run here.
- `drawer3`, `deskPaint` and `deskPaint2` still wait for `.qrd-mail`, which nothing has rendered since v1's K7. They are listed here and were not changed.

## Mobile screenshots (390 × 844 and 768 × 1024)

| Journey | Width | First step | Review |
|---|---|---|---|
| D1 Log a query | 390 | ![](shots/mobile/390-log-first.png) | ![](shots/mobile/390-log-review.png) |
| D1 Log a query | 768 | ![](shots/mobile/768-log-first.png) | ![](shots/mobile/768-log-review.png) |
| D2 Record a response, no query (the picker) | 390 | ![](shots/mobile/390-pick-first.png) | — (a picker has no review: the pick moves it on) |
| D2 Record a response, no query (the picker) | 768 | ![](shots/mobile/768-pick-first.png) | — (a picker has no review: the pick moves it on) |
| D2 Record a response | 390 | ![](shots/mobile/390-resp-first.png) | ![](shots/mobile/390-resp-review.png) |
| D2 Record a response | 768 | ![](shots/mobile/768-resp-first.png) | ![](shots/mobile/768-resp-review.png) |
| D2 Late reply | 390 | ![](shots/mobile/390-late-first.png) | ![](shots/mobile/390-late-review.png) |
| D2 Late reply | 768 | ![](shots/mobile/768-late-first.png) | ![](shots/mobile/768-late-review.png) |
| D3 I've sent it | 390 | ![](shots/mobile/390-sent-first.png) | ![](shots/mobile/390-sent-review.png) |
| D3 I've sent it | 768 | ![](shots/mobile/768-sent-first.png) | ![](shots/mobile/768-sent-review.png) |
| D4 Nudge | 390 | ![](shots/mobile/390-nudge-first.png) | ![](shots/mobile/390-nudge-review.png) |
| D4 Nudge | 768 | ![](shots/mobile/768-nudge-first.png) | ![](shots/mobile/768-nudge-review.png) |
| D5 Close | 390 | ![](shots/mobile/390-close-first.png) | ![](shots/mobile/390-close-review.png) |
| D5 Close | 768 | ![](shots/mobile/768-close-first.png) | ![](shots/mobile/768-close-review.png) |
| D6 The offer | 390 | ![](shots/mobile/390-offer-first.png) | ![](shots/mobile/390-offer-review.png) |
| D6 The offer | 768 | ![](shots/mobile/768-offer-first.png) | ![](shots/mobile/768-offer-review.png) |
| D7 Correct the record | 390 | ![](shots/mobile/390-edit-first.png) | ![](shots/mobile/390-edit-review.png) |
| D7 Correct the record | 768 | ![](shots/mobile/768-edit-first.png) | ![](shots/mobile/768-edit-review.png) |
