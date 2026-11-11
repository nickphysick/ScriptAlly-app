# Onboarding and import — decisions

## Current state

- Newest recorded build: Onboarding v9 (11 Oct; ref design-refs/onboarding-v9/, report reports/onb-v9/REPORT.md).
- The import: v5 parts 1–3, Import fixes and Import truth (10–11 Oct) — one ImportFlow in two homes, no invented values, no double imports.
- Smart Import loader notes and the open A/B gate decision are here too.
- Moved verbatim from CLAUDE.md on 11 Nov 2026 (CLAUDE.md diet; map in docs/claude-md-diet/MAP.md). Sections are newest first by the date in their heading; undated sections come last. A section headed “Branch-only” was recorded as not merged; the note under it says what the 11 Nov check found.
- Later work than the newest section here may exist on branches, with its report under reports/<name>/REPORT.md on that branch. Check `git log` before trusting any “current” claim below.

## Branch-only (not on main): `onb-v9`

_Recorded in CLAUDE.md as not merged. Checked 11 Nov 2026: no branch of this name exists any more, local or on origin (CLAUDE.md records that merged branches were deleted on 15 Oct when main took the dev stack)._

## Onboarding v9 — a warmer set-up, and a review that waits for its answers (11 Oct; ref = design-refs/onboarding-v9/onboarding-journey-v9.html + ref-*.png; report reports/onb-v9/REPORT.md; branch `onb-v9` off `dev/…-truth-qc137` @ 4a8e41b5, NOT merged)
- **Set-up is: the welcome (a navy panel over a card of four options) → the acknowledgement, which types in, then the title → "Your book" (a title page, genre pills, an age row, a word count) → the fork.** The parts are in `components/onboarding/v9/`; the words in `lib/onboardingV9.ts`.
- **All four journeys go through "Your book". "Just getting started" then ends at the Contact list; the other three reach the fork.** `BranchA.tsx` is deleted.
- **A manuscript holds several genres: `genre` is the primary, `subGenres` the rest, stored as labels** (`lib/onboardingGenres.ts`). Genre, age category and status are picked from fixed lists, never typed.
- **`AGE_CATEGORIES` (lib/manuscripts.ts) has six: Picture Book · Early Reader · Middle Grade · Young Adult · New Adult · Adult.** "New Adult" is v9's addition; every screen that reads the list offers it.
- **`Title TBC` (Just getting started only) fills the field with `Untitled manuscript`.** Nothing is written until set-up's one write.
- **The fork rings no tile, and has no drop zone.** A file dropped on the Smart import tile is still taken.
- **The Smart Import hand-off no longer says what it costs.** The tile's fact line and the already-used screen still do. The hand-off is `ImportFlow`'s, so `/import` shows it too.
- **Sage (`--go` #4e7d60, `--go-soft`, `--go-ink`, on `.sf`) is for success marks and the "all answered" band only.** `GoMark` draws the mark. Lock S1 sweeps for any other use.
- **⚠️ NOTHING FLAGGED IS OPTIONAL, AND A REVIEW STEP'S PRIMARY WAITS.** It is disabled until everything on the step has an answer, and its label carries the count. The duplicates step waits too, so an undecided set no longer carries through.
  - **One definition, `lib/reviewGate.ts`,** read by the summary, the deck, the stepper and the button. The gate counts RECORDS: a query with two things unclear is one query to answer.
  - "Carry on without an agency" and "I don't have this date" are answers. A date that reads two ways, an unclear status and a row with no agent and no agency cannot be left blank.
- **Every question is asked in the answer deck (`v9/ReviewDeck`, `v9/DeckQuestions`), one card at a time; the rows beneath are the ready ones and never ask.** The right rail is gone; the FAQ is behind "Questions". "Reset all changes made here" is gone; each answer has "Change this".
  - The deck moves to the next open card IN THE SAME RENDER the answer lands. In an effect it painted the answered card for a frame, and anything reading the deck in that frame saw a question with no answers.
- **A missing sent date is asked about on both paths** (`parseModel` adds `no-date`). The query still lands undated if the writer says so.
- **A status the template parser cannot read is a question, quoted back** (`ParsedQuery.statusRaw`). A blank status cell is read as Queried without asking.
- **A row with no agent and no agency is asked about, not set aside.** Removed, it reaches the skipped-rows notice exactly as the set-aside one did (`seedUnidentifiedSetAside(agents, queries, id)`).
- **⚠️ e2e: a lock that only wants to reach the next review step has to answer first.** `tests/e2e/reviewDrive.ts` is the one driver (`settleStep`, `answerAgents`, `answerQueries`, `decideDuplicates`, `showCard`, `readStep`) and the one set-up walker (`walkSetupToFork`).
- **Locks:** `tests/e2e/onbV9.measure.ts` (W1, T1, T2, B1–B4, F1, S1, G1–G4, M1, R1, on `#/onb-lab`), `onbV9Walk.measure.ts` (the dev walk), `reviewGate.test.ts`. Mutations: `OB9_MUTATE=<lock>`; readings in `reports/onb-v9/`.

## Branch-only (not on main): `import-truth`

_Recorded in CLAUDE.md as not merged. Checked 11 Nov 2026: no branch of this name exists any more, local or on origin (CLAUDE.md records that merged branches were deleted on 15 Oct when main took the dev stack)._

## Import truth — no invented values, no double imports (11 Oct; report reports/import-truth/REPORT.md; branch `import-truth` off `onb-v5-import-page`, NOT merged)
- **An imported agent holds what the file gave, or the field is left out.** All four import writers (the template and Smart Import, the email import, the matcher's agents sheet and its "Create from this row") build the agent with ONE function, `lib/importedAgent.ts` `importedAgentDoc`. No rating, reply window, reply rule, materials or genre of the import's own. Lock A1.
- **⚠️ `submissionStatus` IS REQUIRED BY THE RULES (`isValidAgent`), so an imported agent is written `Unknown`.** No import path reads a status from a file; the import's review can set Open or Closed, and that is kept. `submissionMethod` is required too and still defaults to Email.
- **⚠️ `Unknown` READS AS NOT KNOWN, NEVER AS OPEN. This reverses "decision 3".** The door is three-way: `doorOf` in `agentList.ts` (open · closed · unknown). `isDoorOpen` is true only for a stated Open. The row and the card read "Not known" (`DOOR_NOT_KNOWN`); the Contact list's open filter has a "Not known" choice with its own count; the ready rule, the action grouping and the dream-agent suggestion need a stated Open; the next step counts not-known agents on their own (`doorUnknown`). The editor opens an Unknown agent with neither chosen (`CardDraft.door` is `null`) and still writes only Open or Closed. Lock A2.
- **The import's review holds nothing until the file or the writer gives it** (`ReviewAgent.weeks` and `submissionsOpen` are `null`). It used to fill in 6 weeks for every agent, and its Open/Closed and rating controls were never saved.
- **No import path dates anything from the clock.** The matcher reads a date cell with the template's reader (`matcherDate`: ISO or day/month/year), keeps anything else as no sent date and logs it, passes `{ imported: true }` to `addQuery`, and writes history with `writeImportedHistory` (shared with `commitSmartImport`). The email import orders undated steps from zero. Lock T1.
- **The dashboard card names live queries it cannot draw:** `undatedMoreLine` under the chart's axis ("1 more has no sent date yet."), only when some are drawn; with none drawn the title says it. Exactly one of the two speaks. Lock M1.
- **A query already in the account is not imported again** (`lib/importDuplicates.ts`): same agent, same manuscript, same sent day, or both undated. `splitDuplicates` runs when the file is read (so the summary and review count only what will be written) and the commit checks again. The rows go to the notice as "Already in your queries". A file that is all duplicates shows the nothing-imported card titled "Nothing new to import." Locks R1, R2.
- **ONE agent match for every import path: `sameAgent`** (the same name, and the same agency or one side giving none; an agency-only agent matches only that agency).
- **The dashboard re-reads the skipped-rows notice whenever it changes** (`onImportNoticeChange` in `lib/importNotice.ts`; `saveImportNotice` and `clearImportNotice` announce). It stays mounted while the writer is on the Import page, so reading once showed a stale notice. Lock N3 (the walk: no reload).
- **⚠️ The matcher never drops a row silently for want of a date.** An undated query row is imported undated. An undated history row is not written and goes to the run's log, the "Not imported" count AND the skipped-rows notice, with the review's own label as its reason (`eventDateReason`: "Date needed" / "Date to confirm"). Lock U3 (`importMatcherUndated.measure.ts`).
- **⚠️ A matcher history row attaches only when the manuscript AND the agent match** (`matchHistoryRow` in `lib/importMatcher.ts`, the agent by `sameAgent`). It used to go to the first query on a manuscript with that title. No agent + exactly one query attaches as before; anything else writes nothing and goes to the log, the count and the notice (`historySkipReason`: "Who's this for?" · "Row didn't match an agent" · EMPTY where no existing wording fits). The history sheet gained the agent field. Locks: `importMatcherHistory.measure.ts`, `importHistoryMatch.test.ts`.
- **⚠️ The matcher sets its counts once more AFTER the loop.** A skipped row leaves the loop by `continue`, which passes over the per-row update; a run ending on skipped rows showed stale counts.
- **`submissionMethod` and `sendMethod` stay "Email" on import (ruled 11 Oct).** `sendMethod`'s rule (firestore.rules:445–449) is an enum that denies `""`; `submissionMethod`'s rule accepts `""` but about ten readers print an empty method as "Email" (listed in the report, §0).
- **⚠️ The two out-of-scope header locks (headerPanelV2 P2, headerV3 H11) measure from below the beta strip** (`tests/e2e/betaStrip.ts`) and assert the strip is on screen. Lock H1 (`H1_MUTATE=pagetop|shift4`).
- **Harness:** `tests/e2e/importTruth.measure.ts` (the walk; restores the empty fixture account in a `finally`), `harnessCounts.mjs` (read only), `removeProbeRows.mjs` (run once; the ten 20 Sep probe rows are gone: 73 queries on the harness account).

## Branch-only (not on main): `onb-v5-import-page`

_Recorded in CLAUDE.md as not merged. Checked 11 Nov 2026: no branch of this name exists any more, local or on origin (CLAUDE.md records that merged branches were deleted on 15 Oct when main took the dev stack)._

## Onboarding v5, part 3 — the Import page (11 Oct; ref = design-refs/onboarding/onboarding-journey-v5.html #desk + design-refs/onboarding-v5/ref-desk-*.png; report reports/onb-v5-import-page/REPORT.md; branch `onb-v5-import-page` off `import-fixes`, NOT merged)
- **One import flow, two homes: `components/import/ImportFlow.tsx`.** It holds the import's screens and handlers (confirm, reading, summary, review, importing, the dead ends). Set-up's `BranchB` and the Import page both mount it; neither keeps a copy (lock P2). A host passes props and opens the flow's two file pickers through its ref; while the flow is `idle` it renders only those pickers.
- **`/import` is `components/import/ImportPage.tsx`: the slim title panel, three tiles (Smart import, Our template, Match your own columns), a footnote.** No tile is ringed or recommended. A spent Smart Import disables its button and the fact line says so.
- **`PanelHeader slim`** is the title panel at the reference's measures (174 tall at 1440). Every rule names `.hp3--slim`. `/import` is in `HEADER_PANEL_ROUTES` and its route slot declares no width kind.
- **⚠️ The gap under the header is the grid's `--wpg-chrome-gap`** (28 here, set on `.impg.impg-wpg`). The tiles add no margin of their own.
- **⚠️ In the app the flow's screens sit under a wrapper with the class `sf`** (`.sf.impg-flow`), because their rules are scoped to the set-up frame's class. The wrapper undoes the frame's fixed positioning. `SetupFrame` is not used in the app.
- **The import attaches to the sidebar's active manuscript. With none, it opens on `BookStep`** (set-up's book step, now its own component, mounted by both hosts). The manuscript is created once, at the import.
- **"Cancel" on the summary and the review is drawn only when the host passes `onCancel`** (the Import page does; set-up does not). It asks with the query drawer's four words (`ImportCancelConfirm`; a lock reads `DrawerShell.tsx` for each). Discard calls the flow's `reset()`.
- **An in-app import ends on the dashboard**, with part 2's skipped-rows line.
- **The column matcher is `ImportCsv.tsx` behind the third tile.** Its words are `lib/importMatcher.ts`; its dress is `import/importMatcher.css`. The grids tab, the demo-data button and its own page header are deleted. Its parsing, matching and writing are unchanged.
- **⚠️ The footnote is one sentence.** "An agent already on your contact list isn't added again." is not true of all three tiles (name and agency on two, name alone on the matcher).
- **e2e that drive the matcher go through `tests/e2e/matcherDrive.ts`** and clean up in `finally`.
- **The lab:** `#/onb-lab?s=import-page&ent=…` (tiles per entitlement), `&fx=…` (the flow over a fixture), `&live=1` (real handlers; no manuscript, so the book step).
- **Locks IP1:** `tests/e2e/onbV5ImportPage.measure.ts` (P1, D1–D3, F1–F4, M2, M3, T1; `IP1_MUTATE=<lock>`), `importFlow.test.ts` (P2), `importPage.test.ts` (W1), and the three matcher suites (M1).

## Branch-only (not on main): `import-fixes`

_Recorded in CLAUDE.md as not merged. Checked 11 Nov 2026: no branch of this name exists any more, local or on origin (CLAUDE.md records that merged branches were deleted on 15 Oct when main took the dev stack)._

## Import fixes — dates, counts and labels (11 Oct; report reports/import-fixes/REPORT.md; branch `import-fixes` off `onb-v5-import`, NOT merged)
- **One reader for both import paths: `lib/sheetCells.ts` (`readSheetBook`).** Text formats are read with `raw: true`, so a text date arrives as typed. A real Excel date cell is converted to `YYYY-MM-DD` from its serial number, never its display text. **SheetJS's default read turns `2026-08-02` in a CSV into `8/2/26` and reads `03/05/2026` as 5 March.**
- **A template date flag is a typed reason on its query** (`unreadable-date`, `ambiguous-date`, and the two `-response-date` codes), so the review asks. `TemplateParse.flags` alone is rendered by nothing.
- **⚠️ `addQuery({ imported: true })` is how an import avoids invented dates** (`lib/addQueryShape.ts`). Without it `addQuery` defaults the sent date to now and seeds history steps stamped now; the import may only delete `imp-` steps, so those survive and date every imported stage to the import moment. `ImportCsv.tsx` and the email import do not pass it yet.
- **An all-undated query's ordering keys start from zero** (`UNDATED_ORDER_BASE_MS`), never the import's time.
- **The active card is handed `undatedCount`** and reads "{n} active queries have no sent date yet." when the live count is 0. `isLive` still requires a sent date.
- **The summary counts `summaryModel(result)`**: the parse with the review's automatic set-aside applied.
- **`buildImportNotice` = validation's skipped rows + commit-time skips + automatic set-asides still set aside** (`autoSetAsideRows`, handed over by the review's `onImport(result, left)`). Its count is the list's length.
- **Labels are `lib/importLabels.ts`:** `queryOriginLine` ("No agency" for a named agent), `importActivityLine(source, …)`, `manuscriptErrorLine`. `commitSmartImport` takes the source as its fourth argument.
- **The template parser gives a full timestamp; Smart Import gives `YYYY-MM-DD`.** `fmtDate` and the review's date fields read `dayOf(iso)`.
- **Fixtures:** `tests/fixtures/import/` (built by `build.mjs`). **Locks IF1:** `importDates.test.ts` (D1, D2, D4), `importDateFlags.test.ts` (D3), `importNoInventedDate.test.ts` (U1), `importUndatedCard.test.ts` and `tests/e2e/importFixes.measure.ts` (U2), `importOneCount.test.tsx` (C1), `importLabels.test.ts` (L1).
- **⚠️ The U2 walk signs in as the empty fixture account (`ms21-empty`), imports through set-up, and removes what it wrote** (`tests/e2e/importFixesAccount.mjs`). Run it at one worker.

## Branch-only (not on main): `onb-v5-import`

_Recorded in CLAUDE.md as not merged. Checked 11 Nov 2026: no branch of this name exists any more, local or on origin (CLAUDE.md records that merged branches were deleted on 15 Oct when main took the dev stack)._

## Onboarding v5, part 2 — the import, from "Read my file" to the dashboard (10 Oct; ref = design-refs/onboarding/import-flow-v1.html + design-refs/onboarding-v5/*.png + design-refs/import-flow-v1/*.png; report reports/onb-v5-import/REPORT.md; branch `onb-v5-import` off `onb-v5-setup`, NOT merged)
- **Every import screen renders inside part 1's `SetupFrame` sheet.** The rules are `.sf .im-*` in `onboarding/importFlow.css`. The two loaders keep their timings (`SCATTER_TIMINGS`, `IMPORTING_TIMINGS`, lock R1) and hide the frame's exit.
- **The summary (`ImportOverview`) is two cards, each led by its number.** Its sums come from `lib/importSummary.ts` and are held by lock S1.
- **The review (`SmartImportReview` + `reviewRows.tsx`) is one list card beside a guide card. Every question is answered in its own row; there is no guided walk and no dialog on entering a step.** A settled row's editor carries "Change this" for the three things only the walk could undo.
- **The review restyles; it never re-derives.** `lib/smartImport.ts`, `lib/smartImportCommit.ts` and `lib/smartImportReviewModel.ts` decide. Lock V4 compares what the review hands the import with a capture of the old build (`tests/e2e/fixtures/onbV5Import/`).
- **The importing loader opens the dashboard.** `HandoverScreen` and `lib/onboardingHandover.ts` are deleted; `onImportComplete` always goes to "dashboard". Behind the loader is `DashGhost`, the real `Dash58` in its `loading` state.
- **⚠️ During the hand-off the frame grows by the app's beta strip's measured height** (`--sf-strip-h`), so the frame's shell and the app's shell share one position (lock H2).
- **Rows that were not imported are one line at the top of the dashboard** (`ImportNoticeRow` in `Dash58.tsx`, words in `lib/importNotice.ts`). The notice is saved in `localStorage["sa.importSkipped.<uid>"]`. An open list adds its measured height to the dashboard, so the chart never shrinks (lock N3).
- **⚠️ A row with no agent or agency name is set aside by the review before the commit, so it never reaches that line.**
- **Leaving mid-review asks first** (`SkipSetupConfirm`, `useAskBeforeLeaving`); nothing from the file is saved until the import.
- **The lab is `#/onb-lab?s=reading|overview|review|importing|flow`** (`OnbLabImport.tsx`). The five older dev routes are deleted.
- **Locks:** `tests/e2e/onbV5Import.measure.ts` (OB2: R2–R4, S1–S2, V1–V6, H1–H2, N2–N3, T1; `OB2_MUTATE=<lock>` applies each named break), `importWords.test.tsx` (W1), `importLoaders.test.tsx` (R1), `importNotice.test.ts` (N1).

## Branch-only (not on main): `onb-v5-setup`

_Recorded in CLAUDE.md as not merged. Checked 11 Nov 2026: no branch of this name exists any more, local or on origin (CLAUDE.md records that merged branches were deleted on 15 Oct when main took the dev stack)._

## Onboarding v5, part 1 — sign-up, sign-in and the set-up steps in the app's frame (10 Oct; ref = design-refs/onboarding/onboarding-journey-v5.html + design-refs/onboarding-v5/*.png; report reports/onb-v5-setup/REPORT.md; branch `onb-v5-setup` off `landing-colours-v2`, NOT merged)
- **One frame before the app: `SetupFrame` (components/onboarding/), the ink shell in two forms.** `account` (Auth: brand row, two folder tabs and the exit in the bar; no sidebar) and `setup` (Onboarding: a sidebar holding the steps). It replaced `OnboardingHeader`, `OnboardingSpine` and the fixed overlay.
- **⚠️ FROM 768px UP ITS GEOMETRY IS `inkShell.css`'s BY REUSE.** It renders the shell's own classes (`.ws-app` › `.ws-panel` › `.ws-pin` › `.ws-logo`; `.ws-main` › `.ws-pagebar` + `.ws-winwrap` › `.ws-window`) and mounts the real `FolderTab`. No shell file was edited. Below 768 the shell's desktop rules do not apply, so the phone's tab is dressed in `onboarding.css`.
- **⚠️ SO "A `.ws-window` IS ATTACHED" NO LONGER MEANS SIGNED IN.** The harness reads `#ws-sidebar` / `.ws-work`, which only the real shell has (`tests/e2e/measure.ts` `SHELL`, `auth.setup.ts`). A new e2e waiting for the app must do the same.
- **A set-up step is an open typewriter title on the sheet over one white card** (`setupParts.tsx`: `StepColumn`, `OpenTitle`, `StepCard`, `OptionRow`, `StepFoot`). The navy panel is the account screens' alone. An option row is a radio (`role="radio"`, `aria-checked`), never `aria-pressed`.
- **"Your list" is three tiles, each with its own buttons (`CaptureFork`): no radio, no shared Continue.** One tile is ringed as a suggestion. Dropping a file on the drop zone works (first file; a type the picker would not offer is ignored).
- **The confirm states no row count** — counting rows would read the file before the writer says so. `Change` reopens the picker in place.
- **The dead ends are one card each (`DeadEnd.tsx`).** "Smart Import already used" leads with the template; set-up has no Upgrade exit and writes no `plans` hatch. The unreadable-file card does not say whether the import was spent.
- **The account panel's founding lines are `landingCopy.ts`'s, imported.** The invite field follows `BETA_MODE && INVITE_GATE_ENABLED` as built; `Auth`'s `lab` prop changes what is drawn, never what a handler does.
- **`#/onb-lab?s=<screen>`** mounts every screen and state over fixtures in the real frame, gated on `MODE` like `#/contact-lab`. Handlers are spies recording to `window.__onbLab.calls`. Changing only the query does not remount: reload.
- **⚠️ `.sf-foot` IS THE SIDEBAR'S FOOT; A CARD'S FOOT IS `.sf-cfoot`.** They shared a name for a phase and the card's margin pulled the user row off the sidebar's foot.
- **⚠️ ON A PHONE, mobileShell.css HOLDS EVERY INPUT AT 16px WITH `!important` ON A FOUR-`:not()` SELECTOR.** A rule that must out-size it repeats that chain (`.sf .sf-in:not(…)×4`).
- **⚠️ `browser.newContext()` INHERITS THE PROJECT'S SAVED SESSION.** A cold-session check passes `storageState: { cookies: [], origins: [] }` and asserts the sign-in screen is up first.
- **Part 2 still owns** the reading loader, overview, review, importing loader and handover; `OnboardingCard`, `InboxMotif` and twelve `onb*` tokens survive only for `HandoverScreen`.
- **Locks:** `tests/e2e/onbV5.measure.ts` F1–F4, A1, A3, A4, S1–S4, K1–K3, E1, T1 (`OB_MUTATE=<lock>`, `OB_SHOTS=1`); units `accountScreens`, `accountInviteGate`, `setupScreens`, `captureFork`, `deadEnds`.

## Smart Import — loader (Phase 8) + the agency-less fix
- **Loader (`src/components/onboarding/ScatterSettleLoader.tsx`) — COMPLETE, on dev, NOT on prod.** Five beats: 8.1 timing spine `15412ac` (Intro→Work→Reveal; floor + 10s/30s safety + `onTimeout`) · 8.2 intro squeeze-pop `3125906` · 8.3 work-zone forms `9508acd` · 8.4 on-brand card `1087f6a` (white + `SheenWave` inset frame + `StatusDot` + data via `MountPanel` + the agency display helper) · 8.5 grid → squeeze → big sage tick → Overview `b49ee97`.
- **Reused, not rebuilt:** `SheenWave`, `StatusDot`, the agent display helper (`src/lib/agentDisplay.ts`, `4036ad0`), the big-tick pattern, `MountPanel`. Prop seam `{cards, complete, total, onProceed, onTimeout}` is stable — keep it.
- **Gate model:** Reveal fires only on `complete && elapsed >= floor (~2.8s)` — a fast import never flashes, and crystallise never runs before the real data lands. Watch the looping arc at the dev-only route `#/scatter-loader`.
- **Reduced-motion** path is **code-verified only** (shows cards already gridded, then squeeze→tick, still gated on extraction) — **eyeball it once on a real device** with Reduce Motion on; the one check the preview harness couldn't do.
- **Data-loss bug — FIXED + PROVEN dead:** a real dev import of the messy CSV returns **14 agents / 16 queries with Priya present** (the named agency-less record now survives the whole pipeline). Validity rule = **name OR agency**; an empty agency is never a drop condition. The gate was the Firestore rule `isValidAgent` (see the Deployment dual-DB note — the fix only bit once it reached the `(default)` DB).

## Open decisions — park for a fresh head (do NOT resolve tired)
1. **A/B gate** — do import-review flags **block** import (A, current) or merely **advise** (B, recommended)? Both reviews currently hard-block and MUST stay consistent with each other. Spec for B ready at `scriptally-gate-decision-answer.md`.
2. **"Responses Received" undercount** — imported Partial Sent / Full Sent queries derive `hasAgentResponded=false`, so they under-count. Fix when next doing CSV-import work: seed an implied mini-history, or derive the flag from status position (Partial Requested onward = agent has responded).
