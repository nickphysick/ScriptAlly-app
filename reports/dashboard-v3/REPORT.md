# Dashboard v3 — report (20 Nov 2026)

Branch `dashboard-v3`, cut from `query-card-v161-2` @ 4528a82f4 (what dev served as `index-BCb3LTiD.js`). Not merged; main and prod untouched. Reference `design-refs/dashboard-v3.html`, SHA256 `b18ef228…a691` (matched), committed on its own as d45eef710.

## False premises found
1. **"If Step 0 found it derivable, add a third segment, Not yet queried"** — it was already built. `AgentsHoop` (v60/Dash60Left) draws a Querying / Closed / Not yet queried ring and legend from `agentCoverage().none` (lib/dashFirstUse → Contact list's `deskModel`). No data change was needed.
2. **"Open task, opening the existing TaskModal route"** — `TaskModal` was deleted on 27 Sep (ToDoPage.tsx says so). Open task keeps its existing behaviour: a query task opens the query panel, housekeeping opens the agent card, others their flow. Nothing completes inline.
3. **"the faded example chart with 'Log your first query'"** as existing first-visit behaviour — no such chart exists on this base. Before the first query the middle column is the set-up card (or the resume card), which the tour's first stop needs. It stays; Expected back's labelled example sits under it. The ghost chart was **not** built (see Deferred).
4. Minor: `stageColours.ts` has no navy; "the one navy token" is the page's own `#2d3a50` (`--d2-navy`), as built.

## Step 0
1. **Components.** Page: `Dashboard.tsx` → `dashboard/v58/Dash58.tsx` (desktop). Children: navy header `v2/Dash2Band`; Founding writer `v2/Dash2Founding`; Getting started `fv2/GsSheet` (list `fv1/GettingStarted`); chart with Active/Sent `v2/Dash2Active`; feed `f1/F1Feed`; Next up `v2/Dash2Next`; Closed queries `ClosedHoop` and Agents on file `AgentsHoop` (`v60/Dash60Left`); corner hawk `v2/Dash2Hawk`; set-up card `fv1/SetUpCard`; tour `fv2/FirstVisitTour`; nudge ask `fv2/ReminderAsk`.
2. **Earlier prompts in the base.** Dashboard v2, v2.1, v2.2 (founding fold built, default unfolded), first visit v2, Stage colours v1 (`lib/stageColours.ts`), Status marks v3, Consistency fixes v1.1: all in. **Consistency roll-out v1: not in** — it is its own unpushed branch in `/Users/nickphysick/ScriptAlly-cr1`, committed, touching `dash2*.css`, `Dash2Active.tsx`, `df1.css`, `dash58.css`. Not an overwrite risk (no uncommitted work), but expect merge conflicts.
3. **Expected reply date.** `expectedFor(q, agent)` in `lib/qcSummary.ts`, reached through `buildQcRows` (`expectedMs`, `pastExpected`), built on `resolveExpectedDate` (lib/expectedDate). Dash58 already builds those rows for Next up.
4. **Agents on file.** `agentCoverage` → `deskModel(...).queried` (active / closed / queried); `none = total − queried`. "On the list with no query for this manuscript" is derivable and already drawn.
5. False premises: above.

No red gate tripped.

## Baselines (clean checkout of d45eef710)
- `tsc --noEmit`: Node's default heap runs out (exit 134) on this repo; with `NODE_OPTIONS=--max-old-space-size=8192` and `functions/node_modules` linked, **exit 0** on every phase.
- `vite build --mode development`: exit 0. (Plain `vite build` builds only the public shell.)
- Vitest (full): **12 files / 4 tests failed**, 12 783 passed — `functions/*` suites unable to resolve `firebase-admin` in a worktree, `aiRefusal`, `queryClock`, `smartImportCore`. Not from this pack; no full suite was re-run (no logic-lane change). Every touched spec was run per phase.

## Phases
| Phase | Commit | Files | Checked |
|---|---|---|---|
| ref | d45eef710 | design-refs/dashboard-v3.html | hash |
| 1 header | 438cfdafc | Dash2Band, Dash58, v3/dash3.css, lib/dash3(+test), dash2.test, fv2PartA.test | DB3-1 marks; band unit tests |
| 2 layout | 92fa3361b | Dash58, dash3.css, v3/Dash3Reminder, lib/dashFirstVisit, 5 re-pointed tests | DF1-C, FV2-G, page smoke, foundingBand |
| 3 heads | b1439ba0e | Frame, Dash2Next, dash3.css, v3/dash3Cards.test | DB3-3 |
| 4a third view | 5b7967dc8 | Dash2Active, Dash58, dash3.css, dash3Cards.test | DB3-4a |
| 4b Expected back | 86973bf21 | v3/Dash3Expected, Dash58, dash3.css, tests | DB3-4b |
| 5 agents + GS | 6152929fd | Dash60Left, Dash58, v3/Dash3GsRow, dash3.css, v3/dash3Page.test, 4 re-pointed tests | DB3-5, DFV-D, FV2-H |
| measured | 953b67509 | tests/e2e/dashV3.measure.ts, fixes, readings | 6/6 green |

### What was measured (emulator, harness account)
States: **day one** `db60-pre` (0 queries, page state `pre`), **first weeks** `seed-ms-2` (2 queries: 1 queried, 1 full), **established** `seed-ms-1` (52: 19 queried, 8 partial, 11 full, 1 offer, 13 closed). Each at 1512×982 and 1280×720.
- Header: no Log a query; two transparent outline pills; marks present and in order (none on day one); the band is 44px taller than its text column in every case — it does not wrap (121px day one, 149px with the weeks tag).
- Layout: three columns left→right; founding strip folded, above the grid; no Closed card. Left column: day one `Getting started > Agents on file`; first weeks `Next up > Getting started > Agents on file`; established `Next up > Agents on file > one-row Getting started`. Middle: chart (set-up card on day one) then Expected back.
- One filled button: "Open task" (none on day one).
- Heads: chart navy; Agents on file white; Expected back `#efe6d6` (Queried band); Next up the lead task's stage (offer rose, established; queried sand, first weeks).
- Nothing cut: horizontal overflow 0, no clipping ancestor between any card and the scroller, every card inside the viewport; hawk `position: fixed` in the corner.
- Third view: "22 of 52 agents asked to read more." with three bars; the chart band does not overflow at either width.
- Expected back on the established list: 3 rows due, 2 past; first weeks: nothing due this week, 2 past.

Screenshots: `reports/dashboard-v3/shots/`.

## Built as proposed, not individually ruled
- **Getting started folds to one row with one step left**, under Agents on file; with two or more left it sits open under Next up. **All done → gone**: v2's finish line ("That's you set up") is no longer drawn on the Dashboard (its close event, `getting_started_done`, no longer fires from here).
- **Closed queries card removed** from the Dashboard. `ClosedHoop` is still exported (not deleted).
- Wording **"past their date"** ("{n} are past their date", "since {date}").
- Also chosen without a ruling: "this week" ends Sunday night (local); the bar runs from the stage's start (else the send) to the date; Agents on file's note is "{n} still to query. See them →" (Not yet queried on the Contact list), replacing "{n} ready to query →"; Agents on file is drawn on day one and with no agents (ref's sentence, Add an agent, Discover); the band's two buttons show on day one too (as the ref); the nudge ask's buttons read "Yes" / "Not now" (same answers, same writes); the founding strip is folded unless the writer opened it (a stored `false`).
- Day one's set-up card keeps its own filled button (first-visit behaviour), so on day one "one filled button" is the set-up card's, not Open task.

## Deferred
- The faded example chart with "Log your first query" (false premise 3) — Nick to rule whether day one's middle should lose the set-up card for it (the tour's first stop is the set-up card).
- Merge with Consistency roll-out v1 (dash2 CSS conflicts) — whoever merges that branch.
- No full Vitest run on this line beyond the baseline (visual/copy lane).

## Dev
Deployed: see the session's final message for the bundle hash and URL (https://scriptally-dev.web.app).
