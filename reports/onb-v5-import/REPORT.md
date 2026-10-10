# Onboarding v5, part 2: the import, from "Read my file" to the dashboard

Branch `onb-v5-import`, based on `origin/onb-v5-setup` (`5f5c503d`). Seven commits: groundwork, Phase 0 and Phases 1–6. Nothing is merged to `main`. Prod is untouched.

## 1. False premises and deviations (read first)

1. **"Review all agents stays disabled until every set is settled, as today."** Today it is always enabled. It is still always enabled.
2. **A settled reading-loader card has a navy head.** In the reference the navy head is on the drifting work-zone forms, not the settled cards. The build follows the reference.
3. **The loader's positions are tied to `window.innerWidth`.** They were already relative to the stage (`calc(50% + dx)`). Only the spread needed scaling so nothing overflows a narrower sheet.
4. **The skipped-rows line will show for a row with no agent or agency name.** In the real flow the review sets that row aside before the commit, so the commit never counts it as skipped. The line appears for rows the validator drops and for queries the commit skips because their agent could not be saved. The summary still counts the nameless row as an agent ("12 agents") while the review shows it set aside.
5. **V4's named mutation (drop `agencyWaived`) cannot turn V4 red.** The waiver is review state and is not in the result handed to the import. The mutation is shown red on V3. V4 is shown red by dropping a saved agency instead (`V4b`).
6. **The frame's shell and the app's shell share a position.** The app has a beta strip (41.8px) above its shell. During the hand-off the frame grows by the strip's measured height so the seam is still exact (H2).
7. **The agency fix has "its two actions".** It has three: "Save agency", "Carry on without an agency", "Reference by agency only". All three stay.
8. **Every open row's chip comes from `focusReasonMeta`.** A duplicate set carried to the agents step has no key there, so its chip still reads "Needs a look".
9. **Mark sizes.** The pack's words (tier mark 22px, "+" for sharpen) were followed where the reference's CSS differs (24px, a star).
10. **Not in this pack, found on the way:** the template path loses CSV dates (rows arrive "Undated"); `commitSmartImport` writes `starRating: 3`. Both files are on the do-not-touch list.
11. **`DashboardSkeleton` is no longer mounted by anything.** `Dashboard.tsx` still imports it; it was left alone.
12. **`HandoffNav` loads the app's nav icons with a dynamic import.** Rollup notes that the module is also imported statically. It builds and works.

## 2. Gates

| | Baseline | Now |
|---|---|---|
| `tsc --noEmit` | 0 | 0 |
| `build:dev` | 0 | 0 |
| production build | 0 | 0 (no errors or CSS warnings) |
| Vitest | 545 files, 8,418 passed, 3 skipped | 547 files, 8,435 passed, 3 skipped |
| OB2 (`onbV5Import.measure.ts`) | — | 88 passed |
| OB1 (part 1, `onbV5.measure.ts`) | passed | passed |
| `dashV58.measure.ts` | 1 red (F2) | the same 1 red |

The dashboard's F2 red (the active card at 1280×680 and 1366×650) reads the same three lines on the baseline build and on this one. It is the harness account's data, not this branch.

## 3. §0 Recon

- **0.1 Base.** `origin/onb-v5-setup` exists and is not in `main`. Used.
- **0.2 References.** All 28 hashes match. `import-flow-v1.html` was added to `.refhashes.json`.
- **0.3 Before shots.** 18 shots of the old review are in `baseline/shots/`.
- **0.4 Unmounted.** `NotesLayer`, `GuidanceBanner`, `BANNER`, `PipelineTrack` and `DeadBox` were not mounted. `AgentCard`, `InlineNote` and `NoteActions` were reachable only through a `units` array nothing rendered.
- **0.5 What only the walk could do.** Three change actions: undo an agency waiver, reopen a mapping check, reopen a query's reasons. No fix existed only in the walk. All three now sit in the settled row's editor as "Change this".
- **0.6 Skip.** `BranchB` passed no `onSkip` to either screen. The summary's "Skip setup" was disabled. The review's modal button called nothing.
- **0.7 Sums.** They hold (lock S1).
- **0.8 Row count.** Known only on the template path. The file chip shows it there and shows the name alone on the Smart Import path, whose sample is capped at eight rows.
- **0.9 Dashboard ghost.** `Dash58` takes plain props and has a `loading` state. The ghost is the real component in that state.
- **0.10 Destinations.** The handover page chose between "queries" and "dashboard". The import now always opens the dashboard.
- **0.11 Joining skipped rows.** Possible. Validation's skipped rows, plus commit error lines of the form "Skipped a {status} query — its agent couldn't be saved.", add up to `queriesSkipped`. When the two do not add up, the line states the count without a list.
- **0.12 Chart floor.** DB58 F1 runs at 1512×900, 1440×760, 1280×800, 1280×680 and 1366×650. The floor is 120px.
- **0.13 Dev routes.** The five were gated on `import.meta.env.DEV`, so they reached no build.
- **0.14 Stop conditions.** None met.

## 4. What was deleted, by phase

| Phase | Commit | Deleted |
|---|---|---|
| 0 | `449ae67a` | The second template filename; the drop zone's unreachable size message. |
| 1 | `7b50d858` | The reading loader's fixed full-screen layer, its own nav bar and its `userName` prop; `SheenWave`'s burgundy. |
| 2 | `0f344262` | The old summary: "Top tip", "Why sharpen?", the disabled "Skip setup", the `onSkip` prop, the arrows. |
| 3 | `24d8820f` | `IdentityLine.tsx`, `reviewShell.test.tsx`, the intro beats, the eyebrows, the margin notes, the pills, the "Where you are" strip, `ReconcileCard`'s dev preview. 2,664 lines out. |
| 4 | `919cf51c` | The guided walk and its dialogs; `decideStageEntry`, `doneStageMessage` and the unread `headline` from the model. |
| 5 | `b777131a` | `HandoverScreen.tsx`, `chrome.tsx`, `lib/onboardingHandover.ts` and its test, the `.sa-onb-*` and `.ob-*` rules, twelve `onb*` tokens, the five dev routes and their two harnesses in `App.tsx`. |
| 6 | `cc2a0dfc` | Nothing. |

## 5. Locks retired or rewritten

- `reviewShell.test.tsx`: retired. It read the old shell.
- `onboardingHandover.test.ts`: retired with the page.
- `reviewCopyClaims.test.ts`: rewritten for the new strings.
- `smartImportReviewModel.test.ts`: the cases for the three removed exports went.
- `smartImportConfirm.test.ts`: the lead's two sentences; a frozen copy of the old lead proves only punctuation and the capital changed (S3).
- `mobileFloor.test.ts`, `onboardingCard.test.ts`, `onboardingTail.test.ts`: re-pointed from `chrome.tsx` and the old tokens to the frame.
- `landingRoute.test.ts`, `devSurfaceSmoke.test.tsx`: the five dev routes are asserted gone.
- `captureFork.test.tsx`, `deadEnds.test.tsx`: re-pointed to the new props.

## 6. Locks: red and green

All green at 1440×900, 1280×800 and 390×844 unless noted. Red readings are in `mutation-proofs.txt`; green readings in `readings.jsonl` (143 lines).

| Lock | Green reading | Red, by its mutation |
|---|---|---|
| R1 | timings equal the baseline's | 1 red (floor changed to 1800ms) |
| R2 | both loaders sit inside the sheet (1184×828 at 1440) | 3 red, and 3 red for the importing loader |
| R3 | final status "Ready" | 3 red |
| R4 | marks are navy `rgb(42, 58, 82)` | 3 red, and 3 red for importing |
| S1 | tiers, key and courts each sum to the total (12 and 12) | 3 red |
| S2 | two cards, one primary, Duplicates only when sets exist | 6 red |
| S3 | lead differs from the old one only as the table says | 5 red |
| V1 | no old art, no second nav, guide and questions in the rail | 9 red |
| V2 | no dialog on entering a step; every question has a control in its row | 9 red |
| V3 | 40 answers; the row stays where it was and its chip turns to "Ready" | 3 red |
| V4 | the result equals the baseline's for both fixtures | 1 red (`V4b`); see §1.5 |
| V5 | Reset returns every id and chip count | 3 red |
| V6 | nothing leaves on the first press of the exit | 9 red |
| H1 | the import calls `importComplete("dashboard")`; no handover page | 3 red |
| H2 | sidebar, mark, tab, sheet and page boxes match the app's | 2 red |
| N1 | three skipped rows give three rows | 1 red |
| N2 | the line's words in three cases | 1 red (only the mixed-reasons case can go red) |
| N3 | one screen with the line closed; opening it does not shrink the chart | 3 red |
| W1 | every changed string on its screen; unchanged strings verbatim | 1 red |
| T1 | 233 rules found; every token read resolves; no rust or burgundy primary | 6 red |

## 7. The dashboard chart with the line showing

| Window | Line closed | List open |
|---|---|---|
| 1366×650 | chart 120px (its floor); page fits | chart 120px; page scrolls by 65px |
| 1280×680 | chart 120px (its floor); page fits | chart 120px; page scrolls by 64px |
| 1440×900 | chart 171px; page fits | chart 171px; page scrolls by 64px |

The chart is at its floor at 1366×650 and 1280×680.

## 8. Shots

- `shots/`: every screen at 1440, 1280 and 390; the flow frames; the dashboard with the line closed and open.
- `pairs/`: each screen beside its reference at 1440 and 390, and five flow frames at 1440 and 1280.
- Flow frame 5 (the dashboard with no line) has no pair; frame 6's build side is the signed-in dashboard on the harness account.

## 9. For Nick

### 9.1 The Words table as it now reads

| Where | Reads |
|---|---|
| Reading loader, last status | Ready |
| Summary title | We've read your file. |
| Summary lead | Most of it's ready to go. {Clauses}. / It all read cleanly. Your history's ready to come straight in. |
| Summary cards | {N} agents for your contact list · {N} queries for *{title}* |
| Agents key | {a} with a live query · {b} closed (· {c} not queried) |
| Queries courts | {n} with agents · {n} with you · {n} closed |
| Tiers | Read cleanly. Good to import as they are. · {n} possible duplicate set(s) to merge. Sorted on the duplicates step. · {n} could use an agency(, plus the odd detail to confirm). Nothing's lost without one. · A detail or two to confirm. Each one sharpens your tracking. · Dates read, statuses clear. Good to import as they are. · A few dates to confirm and statuses to clarify. Each one makes your tracking sharper. |
| Tier chips | Step 1 · Optional |
| Summary primary | Let's work through it / Bring it in |
| Stepper | Duplicates · Agents · Queries · Import; captions {n} sets · {n} optional · You confirm · Ready to go |
| Duplicates | One agent looks like they came in twice. / Four agents look like they came in twice. / All duplicates sorted. · Keep one row and its queries combine. Nothing is lost. · Possible repeats, {n} sets |
| Agents | {N} agents for your contact list · Add as much or as little detail as you like. · Agents from your file, {n} ready, {m} to sharpen |
| Queries | {N} queries for your Query Centre · for {title} · Queries from your file |
| Row chips | Ready, or the reason's own label (No agency name, Day to confirm, Status to check) |
| Guide | How this step works · Same agent, twice? · Anything marked needs a quick look. · Dates drive your reminders. (each with its sentence from the table) |
| Questions heading | Questions |
| Primaries | Review all agents · Continue to queries · Import {N} agents · {M} to sharpen / Import and get started |
| Leaving | Skip set-up for now? · Nothing from this file has been saved yet. You can import a spreadsheet or add agents by hand any time from the Import page. · Keep setting up · Skip for now |
| Skipped rows | {N} rows from your file weren't imported. They had no agent or agency name. · Show the rows / Hide the rows · Dismiss |

Removed: the "Top tip" note, the "Why sharpen?" strip, the summary's "Skip setup", the review eyebrows, every arrow, the handover page.

### 9.2 The five things the mocks show that were not built

1. "Skip set-up" on the summary's bar. The frame's "Skip for now" is the one way out.
2. One duplicate set at a time, with "1 of 2" and a closing "Both settled." card. The build lists every set.
3. The chips "Worth a look", "Which date?", "Which status?" and "to check", and the duplicate rows' "Most recent", "Kept" and "Folds into history". The build's labels stay.
4. "· 1 of 2" and "· 2 of 2" after "How this step works".
5. A row count in the file chip on the Smart Import path, where the count is not known.

### 9.3 Row states that read oddly without the walk

- **No agency.** "No agency yet — add it to sharpen this record, or carry on without one. Nothing's lost." sits above three buttons, and the third ("Reference by agency only") is not mentioned in the sentence.
- **A named agent with no agency** shows "Agency only" as its origin line once waived. That is the build's own line and reads wrong for a named agent.
- **A duplicate set carried to the agents step** shows the chip "Needs a look", the one chip not taken from the reason labels.
- **A query with two reasons** shows two question panels stacked in one row. Each is clear alone; together the row is long.
- **The mapping check**: "We weren't fully sure we read this agent's details correctly — worth a quick look." has one button, "Mark as checked", and does not say what to check.
- **The duplicate set's heading** uses the leading record's name, with the build's note beneath. On an agency-less set the note drops "at {agency}" and reads thinly.

## 10. Deploy

See the hand-off message for the served hash before and after; it is recorded in `DEPLOY.md` beside this file.
