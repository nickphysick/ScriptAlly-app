# Overnight fixes v1: the report

- **Branch:** `overnight-fixes-v1`, cut from the served dev tip `7792872ab` and pushed.
- **On dev:** merged into `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align-pk43-wsh1-wsh11-onf1` @ `48f2b6bd9`, pushed and deployed (hosting only).
- **Not done:** no functions deploy, nothing to `main`, nothing to prod.

## 1. False premises (read these first)

1. **Parts 3 and 4 are already under way on other branches.** Nothing was rebuilt or merged.
   - Card offers v1 is fully built (CO1–CO20) on `card-offers-v1`, which is local only.
   - Two-door v1.1 is in progress in a live session's worktree.
   - Details in §2 and `ALREADY-DONE.md`.
2. **The settings-header ref does not exist** (`design-refs/settings-header-v2.html`).
   - Not in the tree, the primary checkout, co1, `~/Downloads`, `~/Desktop` or `~/Documents`; Spotlight finds neither the name nor the hash `c99bd710…`.
   - Part 5 was skipped, as the prompt says to.
3. **The template is still offered once more, and two-door decision A keeps it.**
   - The two-door fork's quiet line is "Keeping your list in a spreadsheet? … Download the headings". It hands out `QueryHawk-template.xlsx`.
   - Decision A, which this prompt says stands, keeps that line, so I kept it.
   - TS1 exempts `templateFile.ts` by name. **Nick to rule:** should the headings line go too?
4. **The plan comparison also offers the template**: `planComparison.ts:82`, "Spreadsheet template import · Fill in our template and upload it."
   - It also feeds the public pricing and landing pages, which this prompt says not to touch, so it stays.
   - TS1 exempts it by name. For Nick.
5. **Part 2 was partly done already.** Agents had a read state and the Contact list had its own error frame (Contact list principles v1). Queries and manuscripts had neither.
6. **The Your notes error was not a component.** It was inline markup.
   - I lifted it into `notes/LoadFailed.tsx` with the same markup, classes and button, and Your notes now draws through it.
7. **Part 6's overflow was already diagnosed** on 6–7 November (`reports/qc-v152-2/emulator-log-diagnosis.md`): the harness leaves closed pages' Listen channels open on the emulator.
8. **Part 7's "Dashboard feed drawer" (`Dash58Feed`) is not mounted anywhere.** `EditAgentDrawer` is retired.
9. **The `-qc151='row'` row selector is stale on v156.** The list's rows are `data-qcv="row"`. This cost Part 6 its query-panel step.
10. **This Mac's `tsc` runs out of memory at the default heap** (exit 134 at about 2 GB). Every gate here ran with `NODE_OPTIONS=--max-old-space-size=4096`.

## 2. The night at a glance

| Part | Part 0 verdict | What happened | Why |
|---|---|---|---|
| 1 Template offers | NEEDED | **Built** | The offers went from 23 source lines and 14 in the built bundle to 0 (two named exemptions). TS1–TS4 green. |
| 2 Failed load | PARTLY | **Built** (queries, manuscripts, five pages) | Agents was done already. LF1–LF4 green, and red under `emptyonerror`. |
| 3 Two-door v1.1 | ELSEWHERE | **Skipped** | `two-door-import-finish` @ `a08f202a1`. Phase 0 only. Live session b2a1f517 in `ScriptAlly-tdf`. 54 commits behind the served line. |
| 4 Card offers v1 | ELSEWHERE | **Skipped** | `card-offers-v1` @ `97e7fa693`, all four phases. Local only, not pushed. `ScriptAlly-co1` holds an uncommitted `cl262.measure.ts` and an untracked REPORT.md. 259 commits behind. |
| 5 Settings headers v2 | NEEDED (ref absent) | **Skipped** | The red gate failed: the ref is not on this machine. |
| 6 Listen overflow | n/a | **Investigated** | Flat in the measurement. The cause is the harness. Three small app leaks were found and not fixed. |
| 7 Drawers a11y | PARTLY | **Built for the three shells** | DR1–DR3, DR5–DR7 green. DR4's dirty-guard case was not written. The page drawers with their own roots were not converted. |
| 8 Deploy + report | n/a | **Done** | Dev serves `index-D4Q6OPP0.js`. |

## 3. Read-only confirmations

- **R1 Reserve list: built.**
  - A freed place promotes the next confirmed waiting writer: `functions/src/waitlistRetention.ts:92-108`, and on an unsubscribe `waitlist.ts:128-135`.
  - The pure half is `functions/src/waitlistModel.ts`, which lives in `functions/src`, not `src/lib`.
  - The promoted writer gets email 2 (`sendWelcome`), the same welcome a new founding writer gets. There is no separate "a place freed up" email.
- **R2 Photo import: built.**
  - "Use photos" opens the photos screen empty, and the file browser waits for the writer's own "Add a page" (`ImportFlow.tsx:79,228`, `CaptureFork.tsx:37`).
  - The heading is "Ok. Let's turn your photos into a smart QueryHawk database." (`lib/photoImport.ts:44`).
  - That it fits on one line was not measured.
- **R3 Contact list header: built.** "{n} agents on file" over "{nq} not yet queried", or "All of them queried" ("Already queried" for one agent) (`lib/contactPrinciples.ts:46`, `AgentList.tsx:698`).

## 4. Per part

### Part 1: the import template is no longer offered

**Recon (Phase 0).** Every offer on the served tip:

| Where | Kind | Now |
|---|---|---|
| `ContactEmptyPage.tsx` "Use our template" tile | offer + download | gone; the two left share the row evenly |
| `ContactWays.tsx` "Downloadable template." (unmounted) | offer + download | gone |
| `A21Empty.tsx` "Use our template" tile | offer + download | gone; the two left share the row evenly |
| `qc155.ts` / `QcState155.tsx` "…or use our template." | link + download | the sentence ends "Bring it in with Smart import." |
| `DeadEnd.tsx` used / unreadable: "Use the template" / "Download the template" | offer / download | "Upload a file" (the doors' picker) and "Add by hand"; the template clause is gone from the text |
| `ImportDoorsPhone.tsx` template group, and the match sheet's template door | download + upload | gone |
| `importPage.ts` `TILE_TEMPLATE` | words | deleted (no reader left) |
| `articles.ts` "Download the template" article, and two links to it | explanation | gone |
| `emailCopy.ts` invite: "or start from the template" | explanation | "Bring your list across with Smart Import, or add your agents by hand" |
| `QueryEmptyCard.tsx` `TEMPLATE_HREF` | link constant | deleted (no consumer left) |
| two-door fork's quiet line "Download the headings" | download | **kept** (decision A, §1.3) |
| `planComparison.ts:82` | offer | **kept** (public pages, §1.4) |

- **Kept, as the prompt says:** the parser, the matcher, the headings route, `template-dmy.csv` and `public/QueryHawk-pipeline-import-template.xlsx` (an old link does not 404).
- **Words:** where the prompt asked for the two-door page's words, the two tiles left keep their existing copy, and their order matches the doors': list first, by hand second. The two-door page has no "add by hand" tile, so its words could not be lifted one for one.

**Commits:**
- `49569b4b9`: 25 files.
- `17c6f731a`: the Help drafts count, 26 → 25, found by the final full Vitest run.
- `7360fc6c0`: TS2 and LF1–LF4 specs.

**Locks:**

| Lock | Red | Green | Mutation |
|---|---|---|---|
| TS1 `src/test/noTemplateOffer.test.ts` (source with comments stripped; two named exemptions, their number asserted) | 23 lines on the served tip (`TS1_ROOT` = `git archive 7792872ab`) | 0 | plant `templateLink: "use our template"` back in qc155 → red |
| TS2 `tests/e2e/onfTemplate.measure.ts` | `TS_MUTATE=threeways` plants the third tile → n = 3 | Contact list 636/636 (1440), 556/556 (1280), gap 16 = row gap, edge 0/0; Analytics 634/634 and 554/554, gap 20 | — |
| TS3 `functions/src/foundingEmails.test.ts` (the rendered invite, text and HTML) | old line put back → red (with EM-11) | green | — |
| TS4 | `twoDoorImport.measure.ts` H2: a headings file reaches the read screen with no callable request and no ConfirmScreen | green | (existing lock) |

**Built bundle:** "Download the template" 6 → 0, "Use our template" 2 → 0, "use our template" 1 → 0, "Upload my sheet" 3 → 0, "Use the template" 2 → 0. What is left is planComparison's "Fill in our template and upload it."

**Re-pointed tests** (each to the 14 November ruling, ids kept):
- `qcState155` ×2
- `queryPaneStates`
- `deadEnds` ×4
- `importPage` ×2
- `QueryEmptyCard`
- `helpContent` (drafts 26 → 25)
- `foundingEmails` (the invite line)

Nothing was deleted.

### Part 2: a failed load shows an error, not an empty account

**Recon:**
1. **The loader:** `lib/db.tsx`'s auth effect.
   - Before tonight, manuscripts and queries marked themselves loaded on error and set nothing, so a failed read was `[]` and "ready".
   - Agents had `agentsRead` and `retryAgents`, from Contact list principles v1.
2. **Pages:**
   - The Query Centre picks `State155` (loading / first / quiet).
   - Dash58 picks `pre` (set-up card, empty feed, getting-started sheet).
   - To-do draws "Nothing to do yet."
   - Analytics draws `A21Empty`.
   - The Contact list already had its own error frame for agents.
3. **Entry points an empty account shows:**
   - the QC day-one link;
   - the Dashboard set-up card, getting-started sheet and resume card;
   - Analytics' "Import the ones you've sent" and its ways;
   - the Contact list's ways;
   - `/import` (its tiles, and the `?resume=1` / `?start=smart` parameters).
4. **Your notes:** `LOAD_FAILED` (`lib/yourNotes.ts:264`), inline markup in `YourNotesPage.tsx`, `.yn-empty` / `.yn-btn` under `.yn`.

**What was built:**
- **Phase 1** (`c4ad9a09e`): `queriesRead` and `manuscriptsRead`, each "ok" / "failed" / "retrying", plus `retryReads`.
  - A failed read sets "failed" before it reports.
  - `lib/loadFailure.ts` holds the words: "We couldn't load your queries / agents / manuscript. Try again?", and "your account" when more than one read failed.
  - A dev-only aid, `__SA_LF`, is gated at each call site.
- **Phase 2** (`d7bf68347`): `LoadFailed` and `useLoadFailure`.
  - **Query Centre:** `State155` gains kind "error", drawn first. The rail is inert, and the header and goal line show no counts.
  - **Dashboard:** the grid gives way to the error, there is no tour, and no weeks show. Dashboard passes the failure in, so Dash58 still imports no db.
  - **To-do:** the workspace gives way to the error. `WsHeader56` takes `todo: null` for a blank title and ring figure.
  - **Analytics:** the error is the body, and the header is in its loading shape.
  - **/import:** the error in place of the tiles and the flow. A resume or start parameter waits until the reads are back.
  - No `firestore.rules` or `functions/` change.

**Locks:**
- **Unit:** `src/lib/loadFailure.test.tsx`, 18 tests: words, down reads, the markup byte for byte, the loader's source, and each page's order.
  - Red when `setQueriesRead("failed")` is taken out of the error callback.
- **LF1:** green. /queries, /dashboard and /todo each show the error with "Try again" and no day-one state. The QC and To-do titles are blank.
- **LF2:** green. No import or set-up entry point anywhere in the DOM after visiting four pages, and `/import` is the error.
- **LF3:** green. "Try again" with the fault lifted gives "88 queries sent", with no reload.
- **LF4:** green.
  - The account was emptied (88 queries, 53 agents, 7 manuscripts), and the population proved 0/0/0 with the read up.
  - That gave the QC day-one panel and the Dashboard set-up card, with no error. The account was restored to 88/53/7.
- **Under `LF_MUTATE=emptyonerror`:** LF1 is red. "No queries yet" draws, with four import entry points (`setup`, `import`, `empty-import`, `way-import`). LF2 was then skipped (a serial group), but LF1's reading holds LF2's subject.

**Re-pointed tests:**
- `qcState155` ×4
- `useQcLoad`
- `todoWorkspaceSmoke`
- `wsSlim56`
- `qcCentre`: its window is 6000 → 6100 characters. The end marker is in a comment the lock strips, so the window was always the fixed fallback, and Part 2 added 26 characters inside it.

**Not covered:**
- An import flow already under way when a read fails is left to finish.
- A writer sent into set-up by the user document (not by the collections) is not gated.
- The phone pages (out of scope).

### Part 3: ELSEWHERE

`two-door-import-finish` @ `a08f202a1`:
- Phase 0 recon is at `reports/two-door-import-finish/` in that worktree.
- Its finding: the draft holds every two-door answer and the rules are not re-run on resume. Only the deck's history is lost.
- Its session (b2a1f517) is live.

**To reach dev:** finish Phases 1–4 there, then merge onto the served line. Expect a conflict in `ImportDoorsPhone.tsx`, where Part 1 here removed the template group and "Upload my sheet".

### Part 4: ELSEWHERE

`card-offers-v1` @ `97e7fa693` (not pushed). Its report is in `ScriptAlly-co1/reports/card-offers-v1/REPORT.md`, untracked, and gives "Keep them as they are" and the rest.

**To reach dev:**
1. Commit or close out co1's `cl262.measure.ts` and the report, and push.
2. Merge onto the served line. Expect conflicts:
   - in `SidePanel.tsx`, which Part 7 here also changed;
   - in `AgentCard262*`, against Contact list v1.1.
3. Run CO8–CO20 there.

### Part 5: SKIPPED (the ref is absent)

`settingsHeadline.ts:56,75,77` still says "All yours." and "Everything's included."

### Part 6: the Listen-channel overflow

See `LISTENERS.md`. In three sentences:
- The 11 November overflow is the harness: the emulator keeps finished test pages' Listen channels open, and later seed writes overflow them at 10,001 pending messages.
- Tonight's measurement held at 19 open targets through 13 pages, 20 agent cards and 5 minutes idle, so there is no app loop.
- The code holds three small leaks to fix (a fix of about 30 lines):
  - `db.tsx`'s auth callback subscribes after an unguarded await, which leaks 14 listeners when a cleanup lands in the gap, as StrictMode makes it do in dev;
  - `handleUndo` overwrites `unsubscribeRef`;
  - sign-out misses `unsubUserTasks()`.

### Part 7: drawers for keyboard and screen-reader users

**Recon** (17 surfaces): only `useOverlay` users (the agent card overlay, ShortcutsSheet, Dash58Feed) did all of it. Each surface, before tonight:

| Surface | Modal? | Before tonight | Tonight |
|---|---|---|---|
| SidePanel (query panel, answer panel) | non-modal; dims during an action | QueryPanelHost and RspPanel focused and restored themselves; nothing trapped | `useDrawerFocus` (non-modal; modal while dimmed, now with `aria-modal`) |
| SidePanel staged Log a query / Add an agent | modal (dim) | no trap, no inert | covered |
| DrawerShell (the query drawer, seven journeys) | modal (scrim) | no focus, no trap, no restore; `TextBox` and `Radios` unnamed | covered; named after their `Fl` |
| HalfDrawer (Housekeeping, MsEdit, Comp) | modal | no trap, no inert, no restore | covered |
| Pk38Drawer, Pk26Drawer, QcBirdsDrawer, NotePanel, V2Overlays, Form11 / EditQueryDrawer | modal | partial (V2Overlays and NotePanel focus and restore) | **not converted** |
| AgentCardPanel262 (non-modal) | non-modal | the edit form's `AaField` labels are spans | **not converted** |
| FeedbackDock, AnchoredPanel | non-modal | focus in, partly | not converted |

**Commit:** `dff35d789`. It adds `shell/useDrawerFocus.ts`, which reuses useOverlay's counted seal (now exported). Only the top-most trap acts, and it sets no style.

**Locks:** `tests/e2e/onfDrawers.measure.ts`, keyboard only, 10 of 10 green.
- **Subjects:** the query panel (non-modal), Log a query (modal) and Housekeeping (HalfDrawer).
- **DR1:** focus is inside after a keyboard open: the query panel's title, the Log journey's first input, Housekeeping's close button.
- **DR2:** 60 Tab / Shift+Tab presses never leave the drawer, and `#root` is inert.
- **DR3:** the query panel's page is not inert, and Tab reaches it.
- **DR5:** focus returns to the opener every time.
- **DR6:** no unnamed control (1 control each in Log and Housekeeping; the query panel's browsing view has none).
- **DR7:** pixel-identical with the hook on and with `__SA_DR_OFF`, each drawer opened by mouse, nothing focused at the shot. Shots are in `drawers/`.
  - Nothing is focused because a focused text field always draws its focus style; that is DR1 working, not a restyle.
- **`DR_MUTATE=off`:** Housekeeping DR1 and Log a query DR2 go red. The query panel stays green, because QueryPanelHost already did this itself.
- **DR4:** not written. Escape still closes through each drawer's existing layer (DR5 closes all three with Escape), but the dirty-form guard case is not locked.
- **No `aria-label`s were added.** The names come from the visible `Fl` (`aria-labelledby`), or from a TextBox's placeholder where no `Fl` sits above it.

## 5. Part 4's "Keep them as they are", and Part 6 in three sentences

Part 4 was not built here, so there is no decision of this session's. Its own branch's report gives it. Part 6 is in §4 above.

## 6. Baseline against final

| Gate | Baseline (served tip) | Final (overnight-fixes-v1) |
|---|---|---|
| `tsc --noEmit` (4 GB heap) | exit 0, 0 errors | exit 0, 0 errors; `functions/` tsc exit 0 |
| `vite build` | `✓ 417 modules transformed.` `✓ built in 1.55s`, no error or warning | `✓ 417 modules transformed.` `✓ built in 1.49s`, none |
| `vite build --mode development` | `✓ 4042 modules transformed.` `✓ built in 12.63s` | `✓ 4045 modules transformed.` `✓ built in 12.34s` |
| Vitest (2 workers) | `Test Files  2 failed \| 869 passed \| 1 skipped (872)` / `Tests  3 failed \| 12567 passed \| 4 skipped (12574)` | `Test Files  3 failed \| 870 passed \| 1 skipped (874)` / `Tests  4 failed \| 12589 passed \| 4 skipped (12597)` |

- **Vitest:** the fourth red was `helpContent` (drafts 26 → 25), which is mine. It was re-pointed in `17c6f731a`, and its file now passes, 21 of 21. That leaves the same three reds as the baseline, all pre-existing source scans over `tests/`:
  - `emuGuard`: `cb21Emu.sh`;
  - `firestoreTarget` ×2: 25 `tests/e2e/*.mjs` files.
- **Area e2e suites** (clq11, qc1561, todoV56, laqV13, onbV9, settingsMode), run on the branch and on the served tip in a throwaway checkout:
  - Branch: 23 failed, 46 passed, 1 skipped.
  - Served tip: 22 failed, 47 passed, 1 skipped.
  - **The one extra red is todoV56 L11, "no phone file changed since the served line"**, which Part 1's permitted `ImportDoorsPhone.tsx` edit trips.
  - The other 22 are red on the served tip too, among them settingsMode ×5, onbV9 ×9 and todoV56 L10 (it wants `TD56_BASE_SHOTS`).
- **Not run under the no-spend rule:** no suite here calls Smart Import. onbV9 reaches the confirm screen in the lab only. No eval or accuracy test was run.

## 7. The served branch, before and after

- **Before:** `dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align-pk43-wsh1-wsh11` @ `7792872ab`, `index-CGBxi7UY.js`.
- **After:** `dev/…-wsh1-wsh11-onf1` @ `48f2b6bd9`, `index-D4Q6OPP0.js`. The hash was checked against the build.

## 8. For Nick

- **Needs your eye on dev:**
  - the Contact list and Analytics empty pages, with two tiles;
  - the QC day-one sentence;
  - the dead ends' "Upload a file";
  - the phone's import page without the template group.
  - Part 2's error can be seen with the dev aid in the console: `window.__SA_LF = { fail: ["queries"] }`, then reload. It is dev builds only.
  - Keyboard: open Housekeeping or Log a query and press Tab.
- **Needs a functions deploy to dev before it shows:** the invite email's new line, "…or add your agents by hand".
- **Two rulings:**
  - the fork's "Download the headings" line (decision A keeps a template download);
  - planComparison's "Spreadsheet template import" row, which the public pricing page also reads.
- **Stopped or skipped, and what it needs:**
  - Part 5 needs `design-refs/settings-header-v2.html` dropped in.
  - Part 4 needs co1's work committed and pushed, then merged.
  - Part 3 is with its live session.
- **Is the two-door branch safe to merge?** `two-door-import` itself is already in the served line. `two-door-import-finish` has only its Phase 0, so it is not ready.
- **Worth a follow-up:** Part 6's small leak fix, and Part 7's other drawers.
