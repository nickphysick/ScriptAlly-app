# Query Centre v138: report

Branch `query-centre-v138` (worktree `~/ScriptAlly-qc138`), not merged to `main`. Parts A to J are one commit each,
plus a follow-up on I, a commit of fixes the locks found, and K (locks, retirements, this report, CLAUDE.md).

## False premises

1. **"v137's empty page stays (navy header, How it works, the three points, Ways to get started)."** The Query Centre
   never had that page. Its empty state was still the living-headers exhibit (`QcEmpty` + `QcExhibit`); the
   construction the pack describes is Contact list v17's (`ContactEmptyPage`). Part I builds it for the Query Centre
   from v17's values (`QcEmpty138`); the phone keeps `QcEmpty`. "How it works" and "Ways to get started" now exist on
   both pages, page-local: a lift candidate.
2. **`isYourMove` = `queryBucket === "move"`, or "waiting" and `replyOverdue`.** Two things are wrong with the literal
   predicate:
   - `queryBucket` files **Offer** under "closed", so offers would have left Your move, whose note reads "requests,
     offers and nudges". `isYourMove` counts an offer explicitly.
   - `replyOverdue` measures the agent's window from `dateSent`; the row's Next move (Query panel v2's `nextDoor`,
     through `pastExpected`) reads the row's own expected date (`expectedFor`: the writer's date, or the stated window
     from the **last** send). The two clocks disagreed on three harness queries (`msv12-q-1`, `seed-query-22`,
     `seed-query-8`). `isYourMove` uses the row's own clock, so a row in Your move always says Nudge and a row that says
     Nudge is always in Your move. `rowFigure` moved to the same clock, so a row in Waiting never counts up.
3. **`listGroupFor` and "No reply yet" are the live list's grouping.** They are not: the live v137 list grouped with
   `urgencyGroup` (qcCalView) into Your move / **Past the date** / Waiting / Closed. Both are moved to the one
   predicate. D1's named mutation ("return overdue from `listGroupFor`") would not touch the live list, so D1 was
   proved red against the live equivalent (`urgencyGroup` filing a lapsed waiting query by court alone).
4. **D1: "The to-do v2 Your move count equals the Query Centre's Your move count."** It cannot, for the same data: the
   to-do tile counts TASK CARDS, not queries. It includes the writer's own tasks ("6 yours"), collapses two requests
   from one agent on one manuscript into one card, and keeps nudges and gone-quiet cards on its own "Chase or close"
   tile. Measured on the harness account: Query Centre **44** Your move; to-do v2 **Your move 19** (13 agent requests
   + 6 yours), **Chase or close 23** (10 nudges + 13 gone quiet). D1 records the to-do figures and does not assert
   equality. Making them agree is a change to the to-do page's model; **for Nick**.
5. **"The pinned row (v137's, unchanged in behaviour)."** v137's pinned row was the ink list head pinned inside the
   list. The mock's pinned row is Contact list v17's page-coloured row along the sheet's top edge, and Part C retires
   the ink head; v138 builds the v17 pattern (`QcPinned138`) with the glyph capsule.
6. **Mock widths.** The mock's "1280" screens have no app sidebar, so their sheet stays on the wide grid. In the app at
   a 1280 window the sheet is under 1180px and the narrow grid applies (as the pack's own rule says). See "for Nick".
7. **RS1.** No suite or lock named RS1 exists in `tests/e2e/`; it could not be run.

## Base

`origin/dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2-comps27-qp2b-comps27-1-qp2c-corkboard1-qp2d-cl16-cl17-cl171`
at `e66e981f`, the branch dev was serving (`index-Cd9X7Zdi.js`, rebuilt identically before any edit). It contains
Query Centre v137, Query panel v2 (`d3ed4754`), Contact list v17 and v17.1. Baseline: tsc clean, both builds clean,
Vitest 581/582 files (the one red, `functions/src/email.test.ts`, is red on `main` too), 8772 tests.

## §0 recon

1. `listGroupFor`, `GROUP_ORDER` (overdue, waiting, move, closed) and `GROUP_LABEL` ("NO REPLY YET"…) in
   `src/lib/queryCentreGroups.ts`; `queryBucket` (status only) in `src/lib/queryAmbient.ts`; `replyOverdue` /
   `replyDeadlineMs` in `src/lib/taskPrecedence.ts`. Readers of `listGroupFor` / "overdue": the legacy list arm in
   `Queries.tsx` only. The live list read `urgencyGroup` (premise 3).
2. "Your move" surfaces: the v137 workspace pill (`court:you`, tileCourt), the row's YOUR MOVE chip (`withYou`), the
   turn chip (`queryBucket`), the legacy list groups (`listGroupFor`), the desk's With you (`rowsForTile`),
   `urgencyGroup`, the stand card (tone from `courtOf`, never the words), the to-do v2 tile (`tileCounts` over task
   categories), Contact list v17's `rowYourMove` (already the new meaning), `agentsPage.statusLine`
   (`queryBucket`), the dashboard (no "Your move"; BarSwitcher's "N with you", `isWithYou`).
3. Next move: Query panel v2's one predicate (`nextDoor` / `nextWords` in `lib/queryActions/entry.ts`), read only.
4. A query's dated events: its `activity` subcollection, read by the panel through `buildTimelineRows`. The peek
   reads the same through `readQueryActivity` (no new write), so §0.7's first stop condition does not hold.
5. Initials circles: listed under Part J below. Greys found: `#b9b0a8`, `#b3aca5`, `#b5aca4`.
6. Filters: v17's pills and panels are page-local (`ContactFilterStrip`); the Query Centre's are built from the same
   values (`QcFilters138`). Lift candidate.
7. Stop conditions: neither holds.

## What moved to `isYourMove`

- `listGroupFor` (returns "move" for both cases; "overdue" retired; `GROUP_ORDER` is move, waiting, closed).
- The live list's Urgency groups (`urgencyGroup` / `URGENCY_GROUPS`: Your move, Waiting, Closed) and the
  "No grouping" split, through `isYourMoveRow` (the same answer from a built row).
- Contact list v17's `rowYourMove` (now calls `isYourMoveRow`).
- `rowFigure` reads the same clock.
- **Not moved:** the to-do v2 tile (premise 4); the panel's stand card (it never states "Your move"; its tone is the
  court); `agentsPage.statusLine` and `queriesPulse` (both explicitly `queryBucket`, status-only, which the pack says
  stays). The dashboard has no Your move count.

## Circles replaced by `AgentDisc`

Contact list: row disc (`clv-ini`), next step (`cl14-disc`), empty example (`cl17-ex-disc`), housekeeping (`hkv-av`).
Agent card (`acq-ini`, quick view and carousel) and agent panel (`apn-ini`). Query Centre: v138 rows, open card
(`qcv-open-ini`), v132 list (`qcw-disc`), Recently updated (`qcr-disc`), Birds-eye (`qcv-tl-ini`), court faces.
Dashboard 58: `d58-disc`, `d58-rowdisc`. Import review (`im-disc`). Discover (`av2`). To-do v2 (`tdv2-av`). Log sheet
(`qls-chip`, both sizes). Legacy f12 list (`f12-av`, `qc-mav`). Standing comes from the Contact list's `discTone`
where the agent's facts are to hand, else querying / closed from the row.

**Behind a prop (`tone="agency"`):** the import review's agency-only circle, and the dashboard's housekeeping discs
(neither stands for an agent).

## Retired

`tests/e2e/RETIRED-query-centre-v138.md`: QC137 A1, B1, B2, C1–C4, D1–D3, L1 (all died waiting for the v137 list;
E1 stays green). Re-pointed rather than retired: the "overdue" unit locks (`queryCentreGroups.test.ts`,
`holdingReplyIntegration.test.ts`) to "move"; QueryEmptyCard's empty-branch lock; the agent card's markup lock; the
legacy list's "selected disc inverts" assertion (retired: a page rule may no longer paint the circle); `qcCentre`'s
"one derived list" lock (filter, then sort). Re-pointed for L1: Query panel v1/v2 and `panelSteady` to the v138 rows,
and `/queries` added to `hp2Lib`'s `LIGHT_HEADER` register (Contact list v17's precedent).

## Locks: QC138

`tests/e2e/qcV138.measure.ts`, ledgers in `reports/qc-v138/ledger/`, proofs in `reports/qc-v138/mutation-proofs.json`.

| Lock | Green | Red (named mutation) |
|---|---|---|
| A1 header | 14/14 | courier image restored: "1 images besides the shadow" |
| A2 glyphs | 20/20 | dashed ring on every glyph: q:1 ps:1 fs:1 cl:1 |
| B1 filters | 8/8 | switch from a copied class: aria-checked false, data-on false |
| C1 sheet | 20/20 | Sort pill restored: 1 sort control |
| C2 sort | 10/10 | sort across groups (source): default and every heading out of order |
| D1 your move | 5/5 | lapsed waiting filed by court (source): 26 rows in Waiting |
| D2 bands | 8/8 | sticky dropped: −154.4 against 213.8 |
| E1 rows | 10/10 | circles by court: rgb(176, 96, 62) |
| E2 due | 6/6 | dial in compact: 59 dials |
| E3 compact | 6/6 | track left visible: rows 50.6 tall, 59 tracks |
| F1 hover | 10/10 | translate skipped: lift 0 |
| F2 peek | 56/56 | stops placed by date (source): overlap and overflow in cases 1–2 |
| G1 select | 4/4 | circle click opens the panel: panel open, ✕ unreachable |
| H1 load | 5/5 | replay on every change: 59 rows animating after a sort |
| I1 empty | 8/8 | "With you": the bands read With you |
| J1 discs | 12/12 | `#b9b0a8` restored: closed discs rgb(185, 176, 168) |

Unit locks: `src/lib/qc138.test.ts` (12: glyph sums, the stage set, the sort, sentence case, the track, the dial,
the peek chain).

**L1:** Query panel v2 8 passed, 1 skipped (as before), after the re-point and the AgentDisc uppercase fix; QC137 E1
green; Contact list v17 13/13 and v17.1 6/6; to-do v2 18/18; feed drawer v2 3/3; header v3 3 passed, 1 skipped.
RS1: not found (premise 7).

## Shots

`reports/qc-v138/shots/`, named after `design-refs/query-centre-v138/screens/*`: top, list, pinned and compact at
1512 and 1280; hover overdue and waiting; select; glyph filter; empty and empty-lower at both widths; the peek
edge-case sheet at 1512 and 1100; `/queries` at 1920 and 1024 (and the 1024 list).

## Integration and dev

See the end of this file (written after the deploy).

## For Nick

- **1280.** At a 1280 window with the sidebar open the sheet is under 1180px, so the narrow grid applies and What you
  sent shows only the package chip (the pack's own rule; the mock's 1280 has no sidebar). Headings are allowed to run
  into their gap rather than truncate there ("First queried" is 101px over a 92px track). Below 900px of sheet (1024)
  What you sent and its heading are hidden, and the pinned row's mirrored search stands down.
- **Your move counts on dev, before and after:** v137 showed "13 your move" (requests and offers) and "31 overdue"
  in separate places; v138 shows **44** in Your move (13 + 31). The to-do v2 tiles read Your move 19, Chase or close
  23 (premise 4): a decision on the to-do model.
- **Peek data.** Every query's events came from its activity log; none failed to feed the peek. Several harness
  queries carry an expected date before their send date (e.g. a 5 Sep query "overdue since 1 Jan"); the peek shows
  them as stored, with a "same day" gap where the order inverts.
- **Glyph folding.** Seven glyphs cover twelve statuses so the counts sum to N: Revise & resubmit under Full
  requested, Resubmitted under Full sent, Signed under Offer, Withdrawn under Closed.
- **Bulk actions** run each ticked query's journey in turn; the next opens when the panel closes.
- **Lift candidates:** the filter pills and panels (v17 and v138), How it works / Ways to get started (v17 and v138),
  the pinned row (v17 and v138).
- **Process:** Part I's first commit went in with a lock red because the gate wasn't chained to the commit; the
  follow-up commit is the repair.
