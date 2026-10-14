# Contact list v17: one light header, a tidier list, better filters, and a full empty page

Branch `contact-list-v17`, in its own worktree, cut from the branch dev serves:
`dev/…-qp2c-corkboard1-qp2d-cl16` at **`da94b2f0`** (Contact list v16 with the shared full-screen hook, deployed to
dev as `index-6EFumRez.js`). One commit per part, A to F, then G for the locks and this report. Not merged to `main`.

## 1. False premises, deviations, and things for Nick

**Premises in the pack that the code does not match.**

1. **There is no Responses page and no "Responses RS1" lock.** No route `/queries/responses`, no file, branch or
   commit names RS1. L1 lists it again; it was not run. §0.2's "strip on `/queries/responses`" has no subject.
2. **The "lifted strip" exists but the Contact list never used it.** `shell/strip/GlanceStrip` is used by Comparable
   titles alone. The Contact list had its own `ContactStrip`; the Query Centre has its own `QcStrip`. v17 stops
   mounting `ContactStrip` and touches neither of the others.
3. **The filter drop-downs are not shared.** `shell/ListPills` is imported only by Contact list files; the Query
   Centre does not use it. So nothing needed restyling behind a prop. The new panels are `ContactFilterStrip`'s
   own; `ListPills` is untouched (the Grouped pill still uses its popover).
4. **The Query Centre has no empty page in this shape, and there is no shared `IndexCard`.** "How it works" and
   "Ways to get started" are built page-local in `ContactEmptyPage`; the example agent's index card wears the agent
   panel's own index-card styles. Both are lift candidates (§7).
5. **"Re-point `ContactWays` steps".** `ContactWays` is the old empty page's three tiles, not the page guide. The
   guide is `contactGuide.ts`; its steps are re-pointed there (§8).
6. **The furthest-stage derivation has no "offer".** §0.4's derivation is `QcRow.furthest` (query / partial /
   full, read from the history). An offer is the query's own status (Offer, or Signed). `lib/contactStage` joins
   the two and derives nothing else.

**Deviations from the pack, each with its reason.**

7. **The pinned row is not `position: fixed`, and there is no position writer at all.** It is a child of the page
   sheet, laid out `top / left / right: 0` at a stated 68px, so its left, top and width are the sheet's own at
   every size, in full screen and while the sidebar moves; the headings' sticky `top` is that same stated height.
   A fixed box would be contained by the page's size containers. JS decides only whether the row is shown. Lock C2
   holds the box to one value while pinned, and its mutation (an interval re-setting `top`) turns it red.
8. **The reference does not fit at 1280.** With every part at its drawn size the Genre field runs 51px past the
   sheet's edge (it does in `screens/01-top-1280` too). To keep "no wrapping, no overflow at 1280" the search box
   is the part that gives: it shrinks from 300px there. The four pills keep their words.
9. **A drop-down's max height.** The pack's `min(560px, 100vh − 220px)` put the Status panel's footer and its
   "Show n agents" button 75px below the fold at a 900px window, because the header sits lower in the app than in
   the mock. The panel also stops 16px above the window's foot.
10. **The hover tray stands down on rows that show "+ Log a query".** The row's existing tray slides over the Query
    status column on hover, and on a never-queried row its first button is also "Log a query" (the plain drawer's).
    It covered the new link completely. On those rows the pointer's tray is hidden; the keyboard's is unchanged.
    **Open:** the keyboard's L on such a row still opens the plain drawer, not the panel's journey (the pack fences
    the row's keyboard).
11. **The Status menu has three options the pack does not list** (Revise & resubmit, Resubmitted, Signed), under
    Querying; and "Taking queries?" has a fourth choice, "Not known", whose description ("Their profile doesn't
    say") is mine. Both exist in the filter today and removing them would change what the filter can do.
12. **v16's full-screen lock is replaced, not kept.** CL16 E1 read the ink bar's button and its count chips. CL17
    FS1 holds the same claims against the pinned row. The hook is the shared one, untouched.

**Two faults the new locks found in my own build, fixed.**

13. **A press on the summary card scrolled the page to the top** (60 → 0). The list's keyboard scroll padding was
    stated always, and a focused control inside a scroller's padding is "not in view" to the browser. It is set
    only while the pinned row is shown now.
14. **Escape did not return focus to the pill.** By the time the panel's cleanup ran, the panel had left the
    document and focus was on `<body>`. Whether focus was inside is remembered while it is true.

## 2. Base and gates

Base tip `da94b2f0`. Baseline on it: `tsc` 0; both builds exit 0; Vitest 8,758 passed, 3 skipped, one file failing
to load (`functions/src/email.test.ts`). Known-red e2e on the base: header panel v2's P7 at 390px on
`/manuscripts/comps` (the Comparable titles header; red on dev's branch without v16 or v17).

On the branch's tip: `tsc` 0; `vite build` and `build:dev` exit 0 (the chunk-size note is the one warning); Vitest
8,766 passed, 3 skipped, the same one file failing to load. No worse than baseline.

**L1, the regression set, on the v17 build (one worker):** contactV17, contactV16 (less its retirements),
contactV11, V13, V14, V15, V15.1, V15.2, V15.3 and compsV25: 66 passed, 0 failed. qcV137, queryPanelV1,
queryPanelV2, feedDrawerV2, headerPanelV2 and headerV3: 42 passed, 3 failed on the first run, all three being the
panel claims still expecting `/agents` to wear the navy title panel. Those claims now skip `/agents` by name
(`LIGHT_HEADER` in `hp2Lib.ts`) and check it shows its own header instead; re-run, two are green and the third is
left with the known red alone (P7 at 390px, `/manuscripts/comps`). Header v3's no-jump lock (H8) was green,
Packages included. "Responses RS1" does not exist (item 1).

## 3. §0 findings

- **On the base:** the header was `ContactOpenHeader` (the shared title panel), then `ContactStrip`, then
  `ContactListHeading`; the list held a sentinel, the ink bar (`ContactListControls` + extras), the filter row
  (`ContactFilterStrip`) and the rows. Pinning was `useContactPins` (deleted in Part C).
- **Stages:** `QcRow.furthest`, plus the Offer and Signed statuses (item 6).
- **Pinning writers on the base:** three sticky CSS rules reading two properties `useContactPins` wrote, plus
  `ListTable`'s `--lt-stick`. v17 has no writer of the pinned row's position (item 7).
- **Neither stop condition applied.** The summary card's filter is the strip's own `glance` state, and
  "+ Log a query" opens the panel's journey: the panel opens for that agent, then the Log a query journey starts
  in it (`logInPanel`).

## 4. What was built

| Part | Commit | What |
|---|---|---|
| A | `9306aa92` | The light header: eyebrow, "{N} agents on file", byline, two buttons, the cut-out hawk and its shadow, the summary card. |
| B | `9026490a` | Search and the filter pills in the header; "Showing…", Grouped, density and Full screen on the list sheet's top row; the ink bar removed. |
| C | `704c201b` | The pinned row along the sheet's top edge, the headings under it. `useContactPins` deleted. |
| D | `4676f268` | Status-coloured discs, margin letters, the stage track, "+ Log a query". |
| E | `532beb21` | The pills, the drop-down panels, the More filters switches. |
| F | `555bdca8` | The empty page; the page guide re-pointed. |
| G | this commit | The locks, the fixes they found (items 8, 9, 10, 13, 14), the retirements, CLAUDE.md, this report. |

In the tree and mounted nowhere: `ContactStrip`, `ContactListHeading`, `ContactEmpty`, `ContactWays`,
`ContactExhibit` (and v16's unmounted `ContactDesk`, `ContactNextStep`, `YourAgentsBar`).

## 5. Locks: red first, then green

Suite `tests/e2e/contactV17.measure.ts`, at 1512 × 900 and 1280 × 800 with the shell (A3 at five widths), one
worker. "Base" is the lock run against the v16 build (`CL17_BASE=1`); "mutation" is the lock with its named break
applied in the page (`CL17_MUTATE=<lock>`). Ledgers are in `ledger/`.

| Lock | Green | Base (red) | Mutation (red), first failing reading |
|---|---|---|---|
| A1 header | 12/12 | 0/12 | the navy panel restored: "1 v16 parts · 1 navy headers" |
| A2 card | 14/14 | 0/2, no summary card | a press scrolls: "30 → 250" |
| A3 no overflow | 10/10 | 5/10, no header to line up | the shadow unclipped: "scroller 2065/1664" at 1920 |
| B1 rows | 8/8 | 0/2, no filter row or sheet row | Grouped back in the filter row: `"group":1` |
| C1 pinned | 10/10 | 0/2, no pinned row | white row: "rgb(255, 255, 255) vs tab rgb(242, 238, 232)" |
| C2 steady | 8/8 | 0/2, no pinned row or sentinel | an interval re-setting `top`: "2 boxes" |
| D1 discs and letters | 10/10 | timed out: no Grouped pill where the lock looks | a letter on every row |
| D2 track | 12/12 | timed out: no "+ Log a query" | every bar filled: "Queried: 4 of 4" |
| E1 pills | 8/8 | timed out: no v17 pill | label left as "Status" |
| E2 panels | 22/22 | timed out: no v17 panel | "Show agents" hard-coded |
| E3 more | 12/12 | timed out: no More filters menu | the switch not reading the filter: `"on":false` with `"checked":"true"` |
| F1 empty | 12/12 | 0/2, not the v17 empty page | the example drawn as an agent row: "1 list parts or agent rows" |
| FS1 full screen | 20/20 | (v16's E1 held it) | the header left on the page: "1 · 0" |

Unit: `contactStage.test.ts` (9 cases).

**What the shared account could not show.** D2 saw agents at Queried, Partial requested, Full requested and Full
sent, and one closed; nobody has an offer, so the four-bar case is held by the unit suite. F1's "adding an agent
switches to the populated layout without a reload" is proved by lifting the dev empty-state override in the page
(the account cannot be emptied): the list appears with no navigation.

## 6. Retired and re-pointed locks

`tests/e2e/RETIRED-contact-list-v17.md` has the table. Retired: CL16 A1, B1, B2, C1, D1, D2, E1; contactV11's
tray-door and old-empty-page cases; two readings in CL13-14. Re-pointed: CL16 C2 and C3; CL13-12, 13; CL14-7, 9,
11, 15, 16; three unit tests.

## 7. Lifts noted, not done

- "How it works" (a frame over one example record) and "Ways to get started" (three cards), for the Query
  Centre's empty page.
- The filter pills and panels (`ContactFilterStrip`), for the Query Centre's filters.
- The summary card and the pinned row's pills share one model; a shared "group filter" control is a candidate.

## 8. For Nick

**Did not fit at 1280.**
- The filter row: the search box shrinks to fit (item 8).
- The summary card's detail lines ("12 ready to query…") are hidden at the compact size, as the pack says; that
  includes 1512 with the sidebar open, where the reference shows them (its sidebar is narrower).
- At 1024 the Housekeeping tab sits over the right end of the sheet's top row (it did before v17 too).

**Agents whose stage could not be derived:** none. Every queried agent on the account has a `furthest`.

**Copy that is this build's, not the pack's.**
- Page guide, step 1 "Your list in numbers": "How many agents you have on file, and how many are not queried yet,
  querying or closed for this book. Choose a row to filter the list." (rings the summary card)
- Step 2 "Find and filter": "Search by name or agency, or narrow the list by status, who's open, and genre."
  (rings the filter row)
- Step 3 "The full list": "Every agent on your list. Group it your way, sort it from its column headings, or jump
  by letter. Click an agent to open them." (rings the list)
- Step 4 "Housekeeping": unchanged.
- The byline with no manuscript in scope: "for your book".
- "Taking queries?" → Not known: "Their profile doesn't say".

## 9. Shots

In `shots/`, beside each `design-refs/contact-list-v17/screens/` file: top, pinned and filtered at 1512 and 1280;
the three menus and full screen at 1512; the empty page and its lower half at both widths; and the top at 1920
and 1024.

## 10. Integration and deploy

DEPLOY_SECTION
