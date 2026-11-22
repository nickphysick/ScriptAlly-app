# Log a query v1.2 — what they ask for, the sample control, a navy header, one journey everywhere, a dimmed page

Branch `log-a-query-v1-2`, cut from `origin/log-a-query-v1-1` (v1.1 is **not** merged to `main`), pushed, not merged.
Design pack `design-refs/log-a-query-v1-2/`: all nine files match `SHA256SUMS.txt`.

## False premises (and what I did instead)

1. **"Matching uses the existing matchesAsk/ask logic."** The app has no `matchesAsk`. That is the mock's function,
   and it compares the sample size too. The app's rule is `packageMatches` (letter and synopsis only), because **an app
   package stores no sample size**. Over the packages, the app therefore names the first package with the right letter
   and synopsis ("First round"), where the mock names "Letter B test" because its sample is 10 pages. For the same
   reason the package rows say "Opening from Version 2" where the mock says "First 3 chapters". I kept the app's rule.
   Building the mock's version needs a sample size on packages, a model change. This is screen 01's 3.54% and its one
   ruler difference.
2. **"Every other door … gets the OLD LogJourney in the old drawer."** Mostly true, with three exceptions:
   - App's navigate bridge serves the sidebar's capture button, the ⌘K palette and the rail's "+ Query". It navigated
     to the Query Centre and opened the **staged** journey there, undimmed.
   - The Contact list's header door opens the Contact list's own host (also staged).
   - The Dashboard's to-do list rows (`lib/dashList.ts`) are doors the list didn't name.
   - The dev line also has a door the branch doesn't: `HostAgentCard.tsx` (Add agent v1).
   All of them now open the staged journey on a desktop (table below).
3. **The pill reads "First 10 pages · V2".** The app's book versions have names, not short labels. The numbers come
   from `readVersions` (`lib/bookVersions`), the way the packages page numbers them: "V2", and "Original" for the
   original. The Version row keeps the full names, as the mock does.
4. **Screens 03 and 06 are the same image** (identical hashes); compared once, as 03.
5. **The packages page lives at `/queries/packages`** (`/manuscripts/packages` redirects).
6. **v1.1's seeded agent advanced twice in development builds.** React's StrictMode runs the seed effect twice, and
   the seed moved on from the stage on screen, so a door that named an agent could open on Materials. Seeds are now
   *placed* from the first stage. Production was never affected (StrictMode is development only).
7. **On the dev line the shared sample control is no longer v1.1's.** To-do v54 made the stepper's figure a typed
   box (an input), and its intrinsic width stretched the stepper to 342px in this journey (reference: 150px). A
   wrapper rule holds it at the control's own 74px (64px small). The shared control is not touched.
8. **Placement over the page.** The mock draws the card over a page 16px from the top, right and bottom
   (`body.inapp .card`). v1.1's 760px-at-most, centred placement was the mock's card *beside its notes*. In the app
   the journey is always over a page, so the panel now uses the in-app placement, at every door.

## Step 0

### 0.1 Every "Log a query" door, and where it lands

| Door | file:line (v1.1 base) | Seeds | Before (desktop) | Now (desktop) | Phone |
|---|---|---|---|---|---|
| Dashboard header `logQuery` | `dashboard/v58/Dash58.tsx:252` | manuscriptId (the book in scope) | old LogJourney, drawer | staged, side panel, dimmed (V12-1) | old |
| Dashboard to-do rows ("Log a query") | `lib/dashList.ts:376, 501` | agentId?, manuscriptId | old LogJourney | staged | old |
| Dashboard phone (×2) | `dashboard/phone/DashPhone.tsx:95, 213` | manuscriptId | (phone) | — | old, unchanged |
| Contact list: agent card's next-step "Log a query" | `agents/AgentList.tsx:952` | agentId, manuscriptId | old LogJourney | staged, starts on Sent (V12-3) | old |
| Agent card (centred host) | `agents/card/AgentCardHost.tsx:415` | agentId, manuscriptId, **dock hooks** | old LogJourney, card docked | staged; the card steps aside through QueryDrawer's own dock effects | old |
| Add agent's "Log a query" (dev line only) | `agents/card/HostAgentCard.tsx:132` | agentId, manuscriptId | old LogJourney | staged | old |
| Agent panel primary act | `lib/agentPanel.ts:263` → `AgentCard262.tsx:75` | agentId | old LogJourney | staged | old |
| Discover's toast | `agents/discover1/DiscoverPage.tsx:195` | agentId, manuscriptId | old LogJourney | staged | old |
| A package's builder | `packages/v26/Pk393Builder.tsx:263` | manuscriptId, **packageId** | old LogJourney, package opened on | staged, that package preselected under the ask card (V12-2) | old |
| Agents phone | `agents/phone/AgentsPhone.tsx:217` | agentId | (phone) | — | old, unchanged |
| Import page "by hand" | `import/ImportPage.tsx:193` | manuscriptId | old LogJourney | staged | old |
| Shell band `onSent` | `shell/AppShell.tsx:428` | manuscriptId | old LogJourney | staged | old |
| Analytics empty state | `analytics/A21Empty.tsx:25` | — | old LogJourney | staged | old |
| To-do workspace "+ Log a query" | `todo/ws/TodoWorkspace.tsx:474` | — | old LogJourney | staged | old |
| Queries phone first run | `queries/phone/QueriesPhone.tsx:226` | manuscriptId | (phone) | — | old, unchanged |
| Old journey's "Log another" (`again`) | `queryActions/journeys/LogJourney.tsx:580` | again (date, way, package/pieces) | old LogJourney | only the phone reaches LogJourney now; a desktop `again` request gets the staged journey with date and materials carried | old |
| Query Centre's own "+ Log a query" (`openCreate`) | `Queries.tsx:759` | agentId, manuscriptId | staged (qcFlow), **not dimmed** | staged (qcFlow), dimmed | old (drawer) |
| App navigate bridge (sidebar capture, ⌘K palette, rail "+ Query") | `App.tsx:316` | agentId, manuscriptId | navigated to the Query Centre → staged there | staged **in place** (Query Centre: its own host; Contact list: its own host) | navigates, unchanged |
| Contact list header "+ Log a query" | `App.tsx:318` → `ContactLogFlow.tsx` | agentId, manuscriptId | staged (Contact list host), not dimmed | staged, dimmed | old |

### 0.2 Seeds the old journey honoured that LogStagesHost did not
`packageId` (preselect), `again` (date, way, package or pieces), the dock hooks (`dock` / `onDock`), `onSaved`
(the card's pulse after a save), `onCancel`, and a book chosen from the request (the drawer resolved
`req.manuscriptId → again → the sidebar's book`). **Now:**
- `packageId`, `again`, `onDock`, `onSaved` (via `onLogged`) and `onCancel` are honoured, and the book is resolved
  as before.
- **Not drawn:** the drawer's dock chip ("Show card" / "Back to card"). The docked card sits under the dimmed page,
  and pressing the page runs the leave check.

### 0.3 The Query Centre's host
Confirmed: `QueryPanelHost` was given `step={qcFlowNode ? false : …}`, and `SidePanel`'s `dim` followed `step`, so the
staged journey opened over an undimmed page. It now passes `dim` for the log flow. The page bar's rule
(`body.spanel-open:not(.spanel-dim) .ws-pagebar { z-index: 67 }`) still puts the bar under the scrim, because the body
carries `spanel-dim`. That class is now **counted**: a panel closing underneath (the Query Centre's query panel, an agent's
panel) used to remove it while the journey was still dimming.

### 0.4 The opening pages' data path
Confirmed: `SampleChoice` was `{ unit, amt, bookVersionId }`, and `materialsOf` rebuilt the sample from
`blankSample()`, so a section was lost. `saveLog` already took a full `Sample`: a section goes into the stored summary
(`sentMaterials`) through `sampleName`, while `materialsWanted` keeps the unit and amount only, as the old drawer did.
`SampleChoice` now carries `sect` / `from` / `fu`. Measured: "Pages 40–64" saves as
`Query letter Letter A · Synopsis One-page synopsis · pages 40–64 · Version 2` (V12-5).

## The seam for D, and why
**`QueryDrawer` hands every desktop `mode: "log"` request to `LogStagesPanel`**
(`queries/centre/LogStagesPanel.tsx`). The panel is the side panel, dimmed, with `LogStagesHost` inside. It is the
one place every drawer door already passes through, so no door had to change. The drawer's own effects still run first
(the dock hooks, the body classes), and the phone path below it is untouched: on a phone LogJourney still runs in the
phone flow, and `LogJourney.tsx` is marked phone-only. The Query Centre's qcFlow and the Contact list's
`ContactLogFlow` keep their hosts and gained the dim and the leave check. App's navigate bridge now opens the drawer in
place on a desktop, except on `/queries`, where it still hands the request to the Query Centre's host.

**Not chosen:** one host for all three. That would have meant taking qcFlow off the Query Centre, which the prompt
keeps.

## SampleControl: reused unchanged
Its rules are global, but they read `--qad-*` tokens declared only on the drawer's roots. **`.laq` joined that one
token selector in `queryDrawer.css`** (one word; nothing copied). Inside the journey, the `.laq-qsamp` wrapper does four
things:
- takes off `.qad-samp`'s ring and padding (the reference draws the control under a dashed rule);
- gives the parts the typewriter face that `.laq`'s inherit rule would take;
- sets the reference's normal line height on the label, number, unit and "Starting at";
- holds the stepper's middle at 74px (finding 7).

The "How much?" popover, `SAMPLE_SIZES` and `sizesFor` are deleted.

## Commits

| Phase | Commit |
|---|---|
| 1 · sample sections in the plan, the ask card's model + tests | `cefde79db` |
| 2 · the ask card and the sample control | `43201271b` |
| 3 · the navy header | `530dee899` |
| 4 · the line, the doors, the dimmed page + e2e | `bd5cdbfca` |
| 5 · fidelity, the in-app placement, the V2 pill | `3ceaccea6` |
| fix · the stepper's width on the dev line | `9456f2372` |
| report | (this commit) |

## Tests

**Gates against the baseline** (v1.1, clean checkout):

| Gate | Baseline | After |
|---|---|---|
| tsc | 2 errors, both `functions/` (no `node_modules` in a worktree) | the same 2 |
| build | clean | clean |
| Vitest | 5 failed / 11,522 passed / 3 skipped (8 files failed) | 4 failed / 11,575 passed / 3 skipped (3 files failed) |

All four failures are among the baseline's five: the fixture generator, the emulator guard, and two firestoreTarget
lists, none naming a file of this pass. More pass because `functions/node_modules` was linked in, so the `functions/`
suites load.

**Unit** (`lib/queryActions/logStages.test.ts`, 25 cases):
- a section round-trip, from the control's `Sample` through the plan into the save's summary;
- an opening choice saves as the opening;
- the ask card's states: matches, differs, a section never matching, not ticked, extra, nothing stated (both views),
  a package that matches, none matching;
- the one FlowHead line and its two exceptions.

**Browser** (`tests/e2e/laqV12.measure.ts`, 39 checks over `seedLaq12.mjs`, the reference's own data, removed after):
- **V12-1** The Dashboard's door: the journey opens on the Dashboard over a dimmed page (scrim `rgba(28,19,15,.45)`,
  `spanel-dim` on) with a navy header and track (`rgb(42,58,82)`) and the one line. No answers: pressing the page
  closes it. With answers it asks "Discard this? Nothing has been saved yet."; Keep going keeps it, Discard closes.
- **V12-2** A package's builder: that package is preselected under the ask card, without navigating.
- **V12-3** An agent's card: the agent is set and the journey starts on Sent, dimmed.
- **V12-4** The ask card: matches, then differs ("You're sending the first 3 chapters, not the first 10 pages."), then
  "Synopsis isn't ticked.". "Use what Marcus asks for" brings back the match, and Continue is never stopped. Nothing
  stated: the quiet note in both views, with no button.
- **V12-5** The control is closed when the card states the ask, and open as soon as Opening pages is ticked when it
  says nothing. "Pages 40–64 · V2" is the pill, the Version row reads "Version 2 current / Version 1", the save says
  "pages 40–64", and Undo removes the query.

**v1.1's journey suite** (`laqV1`): LAQ1–9 pass after three updates: LAQ6 and LAQ7 now expect the one line, and LAQ9
expects white finished nodes.

All of the above also passed on the merged dev line before the deploy. Every heavy run went through the test slot.

## Fidelity (Phase 5)
`tests/e2e/laqFidelity12.measure.ts` opens the mock and the build at 1440×900, with the mock in "Over the Dashboard,
dimmed", since the app is always over a page. It reads 130 values across 01, 02, 03 (= 06) and 07:
- each named part's box, relative to the panel, within 1px;
- its font, size, weight, style, colour, background and corner radius.

129 are equal. The one difference is 01's package row height (82.4 vs 63.5): the longer sub-line wraps (premise 1).
08's scrim equals the mock's.

| Screen | Pixel diff (the panel; 08: the drawer's own box) |
|---|---|
| 01 asks over packages | **3.54%**: the matching package and the package sub-lines (premise 1), and the dev-only "BG LAB" chip |
| 02 asks differ, control open | 1.58% |
| 03 / 06 asks match | 1.46% |
| 07 nothing stated, control | 1.34% |
| 08 over the page, dimmed | 1.34% |

The side-by-sides are in `side-by-side/`, the panel shots in `shots/`, and every reading in `fidelity.json`. The
residue under 2% is text anti-aliasing and the dev-only "BG LAB" chip, which sits on the panel's bottom-right in
development builds only.

## Departures from the reference, with the reason
- **The matching package and the package sub-lines (01):** the app's packages have no sample size (premise 1).
- **The dock chip is not drawn:** the docked card sits under the dimmed page, and pressing the page runs the leave
  check.
- **The panel's width steps to 504 at ≤1400px:** the query card's own step, kept from v1.1. The mock has no narrower
  width.

## Deferred, named
- **Phone:** every door at ≤767px still opens the old journey in the phone flow. It is still old and needs a phone
  design. Phone doors: DashPhone (×2), AgentsPhone, QueriesPhone, and LogJourney's "Log another".
- **v1.1's fidelity suite:** its logging half (`laqFidelity.measure.ts`, F-log) is superseded by `laqFidelity12` and
  will read the old header colours. Its editing half (F-edit) still describes the query card, so the file is kept.
- **The drawer's own sample control on the dev line:** To-do v54's typed box may stretch the stepper there too
  (finding 7). Not in this pass's scope, and not measured.

## Dev
- **Deployed:** https://scriptally-dev.web.app now serves `index-BVzRmv5j.js`.
- **Branch:** `dev/qc153-…-laq11-td55-laq12`, pushed. It is the line dev was serving (`…-laq11-td55`, To-do v55,
  `index-BbOKFQSr.js`) plus this branch.
- **Check before deploying:** a rebuild of the served line differed only by Sentry's release stamp and the chunk names
  that follow from it.
- **Conflicts:** one, an import line in `App.tsx`; both sides were kept.
- **Not deployed:** prod.
