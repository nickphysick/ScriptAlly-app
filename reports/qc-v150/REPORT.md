# Query Centre v150: stat cards, the list title, and Birds-eye as a view of the list

Branch `query-centre-v150`, cut from the branch dev served (`dev/hm31-pv4-qc1492-dh41-cl24-hm32-pk26`, b9f2fd35,
`index-CN7x9BIo.js`, which carries v149.2). Refs in `design-refs/query-centre-v150/`, all 22 hashes as given.

## False premises

1. **"Gone quiet · N ready to nudge (the existing nudge rule)."** Under the existing rule (`nudgePhase`,
   lib/nudgeWindow), a query past its reply date by 28 days or fewer is *nudge-due*, and `whereItStands` files it under
   **With you** (the Your move card). Every Gone quiet query is past the nudge window, and its next move is "Close
   query". So nothing in Gone quiet is ever "ready to nudge" by that rule. **Ruling (Nick, at Step 0):** the line counts
   Gone quiet queries with no nudge on record (`lastNudgeSentDate` unset). On the harness account that is 32 of 32.
2. **"Your move" equals the mock's 4.** It doesn't: the card must equal the retired chip (`whereItStands` "you"), which
   includes the nudge-due queries. The mock's numbers come from a frozen date and an older rule (its Birds-eye also
   shows "Nudge" at 119 days over, which today's rule calls "Close query").
3. **"The list is 1224px at 1512 × 900 and 992px at 1280 × 800."** Those assume a sheet 8px wider than this shell's.
   The formula min(S − 40, 1320) holds: the sheet is 1256 at 1512 (list 1216) and 1024 at 1280 (list 984). L4
   asserts the formula, not the prompt's figures.
4. **"Cards in a row share a height (≈166px)."** The mock's own cards are 199px tall. Ours are about 216px at 1512,
   because the Closed card's split ("14 passes · 1 withdrawn · 2 no response") takes two lines. They share a height
   (L2 asserts it).
5. **"Retire the floating pill and its drawer: delete them."** The drawer is also the phone page's only Birds-eye: its
   tab and the carousel's "Or open the Birds-eye view" have no media guard. Phone layouts were out of scope, so on the
   desktop the pill and drawer are **not mounted**, and below 768px they stay. `QcBirdsDrawer.tsx`/`QcTimeline.tsx`
   are not deleted.
6. **"Pressed card: navy fill, with all text cream."** The mock keeps the pale head tint under cream text, which does
   not read. The pressed head is a cream wash on the navy instead (cream text on it).
7. **"The status dot (the StatusDot glyph for that court)."** `StatusDot` draws statuses, not courts. The head uses the
   court swatches the retired chips used (`.qc149-sw`), which is what the mock draws.
8. **Part E's search placement needed Part C.** Retiring the view row (C) would have stranded Find, so the search
   moved into the navy bar in Part C's commit; Part E then dropped the pill prefixes.

## Step 0

1. **Birds-eye today:** `QcBirdsDrawer.tsx` (the `.bvd-tab` pill bottom-right, the B key, a right-hand drawer) wraps
   `QcTimeline.tsx`. Data: `qcScoped`, the manuscript-scoped rows. Stage history: `row.history.spans` from
   `stageHistory` (lib/qcStages), which reads the query document's dates first and the feed only for undated stages;
   `tlRow` (lib/qcTimeline) turns spans into past bars. Groups: `bvdGroups` (lib/qcBirdsDrawer): Overdue / Upcoming /
   Watch from `attentionGroup`, plus "No date" for undated agent-side rows (`whenOf`). Action: `nextMove` → `nextDoor`
   (lib/queryActions/entry), the nudge-window rule.
2. **Stat cards:** the four sets are `whereItStands` (lib/qcSummary), the same sets `whereCounts` gives the chips.
   - Your move: `waitingRows` (earliest date first, undated last); Next = the top row's owed thing + `whenWords`.
   - With the agent: count; "due this week" = expected date from the start of today to 7 days ahead.
   - Gone quiet: count; "ready to nudge" = no `lastNudgeSentDate` (ruling above).
   - Closed: count; split by status: Rejected (passes), Withdrawn, No Response (Signed is closed but in no part).
3. **Filter wiring:** the chips wrote `qcF138.where` through `qcShowWhere` / `pressView`; no URL param; the filters
   persist for the visit in sessionStorage `qh.qc.filters`. The cards reuse exactly that.

## Commits (on `query-centre-v150`)

| Part | Commit | |
|---|---|---|
| A | 0a519a2f | doodle sheet, tighter header, banner removed; refs enrolled in the ref-hash watchlist |
| B | 8457728e | QcStatCards150 + lib/qc150 `statCards`; chips and the bar's heard-back retired |
| C | 25cdc9a3 | list min(S − 40, 1320); QcListTitle150 (title, count line, switch); search into the bar |
| D | 115e5f82 | QcBirds150 inside the list card; Birds-eye pills; desktop pill/drawer unmounted; guide step |
| E | 52cfde0a | pills show their value only; search flex 200–300 |
| Locks + report | (this commit) | QC150 L1–L12, the L13 re-points, the screens, this report; one fix in QcBirds150 (below) |

**Remembering the view:** the app's view prefs are per device (localStorage `qh.qc.view`), never per user, so the
switch is remembered for the session (sessionStorage `qh.qc.view150`). `?view=calendar` opens Birds-eye.

**Guide step:** `birds` (lib/pageChecklist `QC_CHECKLIST`). On the desktop it points at the switch's Birds-eye button
and ticks when the list switches to it; its line drops "Press B" (the desktop has no B key now).

**One product fix came out of the locks:** L7 found a tick drawn 1px past the axis edge (its measured width was a pixel
off the painted one). "Wholly in view" now keeps 2px clear of each edge. It is in the locks commit.

## Locks (`tests/e2e/qc150.measure.ts`, 1280 × 800 and 1512 × 900)

All 24 cases are green on the v150 build (25 passed with setup). All 24 were red against the pre-v150 build
(`QC150_BASE=1`, ledgers `reports/qc-v150/ledger/base-*`). Each was then red on its named mutation:

| Lock | Mutation | Red at |
|---|---|---|
| L1 dressing | the banner restored (page) | "no banner" |
| L2 cards | the chips rendered again (page) | "no chips" |
| L3 card filter | Birds-eye reads the unfiltered set (source) | "birds narrowed: 71 of 71; 59 not with the agent" |
| L4 widths | v149.2's list width (page) | "list width 1136 vs 1216" / "960 vs 984" |
| L5 title | the switch moved into the bar (page) | "switch centred", "no switch in the bar" |
| L6 one scale | rows offset 16px (page) | "dots on the line", "bars on the axis" (every bar 16.0 off) |
| L7 no overlap | the measured-fit rule dropped: whole label always, always shown (source) | "clipped", "overlap" at every zoom |
| L7b | the hide-when-partial guard alone dropped (source) | "clipped" |
| L8 smooth | rows re-keyed on pointermove (source) | "no rebuild: 0/142 the same elements" |
| L9 past bars | past bars hidden (page) | "two past bars" |
| L10 pinning | the date row not sticky (page) | "flush", "both visible" |
| L11 group/sort | Birds-eye's group writes the list's (source) | "the list's grouping held: Status → Next action → Status" |
| L12 open | the pill mounted on the desktop (source) | "no floating pill" |

Two first mutations stayed green and the locks were repaired. That proved the locks vacuous, not the code correct:

- **L7:** dropping only the fit choice changed nothing visible, because the second guard (a label hides once it
  can't be shown whole) caught it. The faithful mutation drops both; L7b proves the second guard on its own.
- **L11:** the list's default grouping is already Status, so sharing state showed nothing. The lock now sets the list
  to Next action first.
- **L8:** a rebuild keeps the node count (1310 before and after), so the lock also checks element identity.

L9 needs its own query: `node tests/e2e/seedQc150.mjs` (three dated stages; `--clean` removes it). It is seeded on dev
now (`qc150l9-q`, agent "Wren Calloway"). Remove it with `--clean` when it's no longer wanted.

### L13: no regression

| Suite | Result | Re-pointed |
|---|---|---|
| QC149 | green; L2 skipped (v149.2), **L3, L4 retired** | L1: art 160 × 140 and title 40px (v150 A2). L3 (banner) and L4 (chips) are `test.skip` with the reason. L5: heard back absent from the bar at every width. L12: All/Closed read off the list's rows, not the chips. |
| QC1491 | green (L11 skipped since v149.2) | none |
| QC1492 | green | L1: min(S − 40, 1320). L2: header card and stat cards share edges at the v149.2 width (the banner and view row are gone). |
| QC142 L8 | red | none; **red at baseline too** (landing screenshot diff), so not a regression |
| CSS1 | L9 red | none; **red at baseline too** (Contact list well, population null) |
| Versions L0 (QC149-L0) | @1280 red | none; **red at baseline too** (2.0% pixel diff); the PageHeaderCard and its CSS are untouched |

Unit gates: tsc clean, production build clean, Vitest 662 files / 10,443 tests passed. At baseline,
`queryCentreOverlay.test.ts` §3 failed once and passed on every later run (flaky, not ours).

## Screens

Ours in `reports/qc-v150/shots/`, refs in `design-refs/query-centre-v150/screens/`:

| Screen | 1280 | 1512 |
|---|---|---|
| 01 top | [ours](shots/01-top-1280.png) · [ref](../../design-refs/query-centre-v150/screens/01-top-1280.png) | [ours](shots/01-top-1512.png) · [ref](../../design-refs/query-centre-v150/screens/01-top-1512.png) |
| 02 list | [ours](shots/02-list-1280.png) · [ref](../../design-refs/query-centre-v150/screens/02-list-1280.png) | [ours](shots/02-list-1512.png) · [ref](../../design-refs/query-centre-v150/screens/02-list-1512.png) |
| 03 card pressed | [ours](shots/03-card-pressed-1280.png) · [ref](../../design-refs/query-centre-v150/screens/03-card-pressed-1280.png) | [ours](shots/03-card-pressed-1512.png) · [ref](../../design-refs/query-centre-v150/screens/03-card-pressed-1512.png) |
| 04 Birds-eye | [ours](shots/04-birdseye-1280.png) · [ref](../../design-refs/query-centre-v150/screens/04-birdseye-1280.png) | [ours](shots/04-birdseye-1512.png) · [ref](../../design-refs/query-centre-v150/screens/04-birdseye-1512.png) |
| 05 pinned | [ours](shots/05-birdseye-pinned-1280.png) · [ref](../../design-refs/query-centre-v150/screens/05-birdseye-pinned-1280.png) | [ours](shots/05-birdseye-pinned-1512.png) · [ref](../../design-refs/query-centre-v150/screens/05-birdseye-pinned-1512.png) |
| 06 6M | [ours](shots/06-birdseye-6m-1280.png) · [ref](../../design-refs/query-centre-v150/screens/06-birdseye-6m-1280.png) | [ours](shots/06-birdseye-6m-1512.png) · [ref](../../design-refs/query-centre-v150/screens/06-birdseye-6m-1512.png) |
| 07 6W, back | [ours](shots/07-birdseye-6w-back-1280.png) · [ref](../../design-refs/query-centre-v150/screens/07-birdseye-6w-back-1280.png) | [ours](shots/07-birdseye-6w-back-1512.png) · [ref](../../design-refs/query-centre-v150/screens/07-birdseye-6w-back-1512.png) |
| 08 group menu | [ours](shots/08-group-menu-1280.png) · [ref](../../design-refs/query-centre-v150/screens/08-group-menu-1280.png) | [ours](shots/08-group-menu-1512.png) · [ref](../../design-refs/query-centre-v150/screens/08-group-menu-1512.png) |
| 09 by Status | [ours](shots/09-group-status-1280.png) · [ref](../../design-refs/query-centre-v150/screens/09-group-status-1280.png) | [ours](shots/09-group-status-1512.png) · [ref](../../design-refs/query-centre-v150/screens/09-group-status-1512.png) |
| 10 card from Birds-eye | [ours](shots/10-birdseye-card-1280.png) · [ref](../../design-refs/query-centre-v150/screens/10-birdseye-card-1280.png) | [ours](shots/10-birdseye-card-1512.png) · [ref](../../design-refs/query-centre-v150/screens/10-birdseye-card-1512.png) |

The data differs from the mock's: the harness account has 87–88 queries, several books, and today is 25 Oct, not 8 Oct.

## Dev

See the deploy section below.

## Left undone, and why

- **Deleting `QcBirdsDrawer.tsx` / `QcTimeline.tsx`:** kept for the phone page (premise 5). Delete them when the phone
  gets its own Birds-eye.
- **"0 due this week" / "0 ready to nudge" are stated, not linked:** a link to an empty Birds-eye goes nowhere. A
  wording choice for Nick.
- **The applied-filter chip under the bar still says "With you"** when the Your move card is pressed (it is the old
  `WHERE_LABEL`). Left alone: renaming it reaches the Filters menu and the Contact list's shared labels.
- **Birds-eye's "No date" group** (from the existing urgency rule) is kept, as the prompt's D8 lists it; the mock omits it.
