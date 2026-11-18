# Analytics v26 — report

One short page at `/queries/analytics`, built only from the writer's own records (design-refs/analytics-v26).
Branch `analytics-v26`, cut from what dev served this morning; NOT merged to main; prod untouched.

## False premises

1. **"Phone 390" (references, L1).** Below 768px the route does not mount this page: `phone/pages/PageRoutes.tsx`'s
   `AnalyticsRoute` draws the phone app's own `AnalyticsPhone`. The three `*-390@2x.png` references therefore have
   nothing to sit beside on this route. v17's phone glance strip in `QueryAnalytics` was already unreachable (its
   ≤760 branch sat under a route that switches at 768). The v26 CSS still stacks to one column at 760. L1 reports the
   390 route (no overflow) rather than asserting this page's parts there. **Ruled (Nick, 18 Nov): v26 stays
   desktop-only;** the phone keeps `AnalyticsPhone`.
2. **"The app's current status fills."** There are none: status marks v3 (17 Nov) draws status by shape only, one ink
   (`StatusDot`'s header: "colour carries nothing"). Every mark is a `StatusDot` on one neutral disc token; when the
   slate ladder lands, the disc is the one place to take it.
3. **"Replace the Current state lines in `docs/decisions/analytics.md`."** That file does not exist on the dev line
   (it is on main, moved there by the 11 Nov CLAUDE.md diet). Created here with the v26 state; at merge, put its v26
   section on top of main's file.
4. **"Retire … v21's header and card."** On the base they were already gone: Workspace headers v1 (14 Nov) had swapped
   v21's light header and white card for the shared navy header inside `A21Header.tsx`. What was retired is that
   wrapper and its "Replied on time" ring.
5. **"Take the base from the branch dev serves."** Dev moved during the day. This morning it served
   `dev/smv31-vv6-cp32-lqmf1-cb15-td57` @ dad7fdbce (`index-DJ8tuHvN.js`), which is the base. By deploy time it served
   `dev/…-td57-qc157` @ e8224054e (`index-YTBrCozr.js`, Query Centre v157); the deploy merges v26 onto that (clean).
6. **"The Early header: Your oldest query has been out … No replies recorded yet."** True only with no reply at all. With
   1–4 replies (still Early) the mock shows the "Asked to read more" block, and the page follows the mock.

Everything else held: v24.1 is on the base; the shared header exists (`shell/WorkspaceNavyHeader`); every data source
named in §0.4 is there (below).

## Base, §0

- **Base:** `dev/smv31-vv6-cp32-lqmf1-cb15-td57` @ dad7fdbce, with `src/lib/analyticsV24.ts` and
  `design-refs/analytics-v24-1/`. References: all ten hashes match; enrolled in `design-refs/.refhashes.json`.
- **Header:** `shell/WorkspaceNavyHeader` (OpenHeader + SlimBar in a `.qc151.qc153.wsnh` wrapper). Its art slot
  `analytics-header` now carries the Archivist (`public/images/analytics/analytics-archivist.webp`, the same bytes as
  `design-refs/analytics-v21/analytics-archivist.webp`).
- **v24's parts and their fate:** A21Header (the wrapper over the shared header), A21Desk, S1–S7 (A24S1…S7, A24Frame,
  A24Pairs), A24Steps, A21Empty, the section tab and the glance strip (A17Frame), a17/a21/a24.css — all deleted.
  `analyticsV24.ts` stays and is unedited; v26 imports `outcomes`, `replyTally`, `isDatedReply`, `benchmark`,
  `expectedByNow`, `BENCHMARKS_QUERYTRACKER`. `analyticsV21.ts` stays (analyticsV24 imports `desk`, `replyWhat`,
  `windowReplies` from it). `deskV24`, `heads`, `ringOf`, `QUESTIONS`, `buildV24` now have no reader but their tests
  (left in place: "don't edit analyticsV24's exports").
- **Data:** send dates and replies through the model's `items` (`outcomes`, `replyTally`); `Agent.genres[0]`;
  `Query.personalisationNotes`; nudges from the activity log (`eventKey: "nudge_sent"`, or an unkeyed `Nudge Sent`),
  `Query.lastNudgeSentDate` only where the log has none; Gone quiet = `quietWeeksOf(currentUser)`
  (`workspacePrefs.clock.quietWeeks`); first nudges due = the task engine's `nudge_overdue` with
  `reason: "nudge-first"` (`lib/db.tsx`).
- **Links:** Settings opens at `/account/preferences`, where "A query goes quiet after" is. **Queries and the Contact
  list open unfiltered**: the Query Centre has no id-set or date-run filter a link can set, and although the Contact
  list keeps a genre + "Not queried yet" filter in session storage, every workspace page stays mounted, so a preset
  would only be read on a first visit. A mark opens its query's card (`openQueryPanel`).

## Derivations

New, `src/lib/analyticsV26.ts` (29 unit tests on the mock's sample): `nowGroups`, `pathSteps`, `replyTimes`, `rounds`,
`whoSaysYes`, `nudgeResults`, `findings`, `buildV26`, plus `wk`, `weeksOf`, `oneIn` ("all of them", never "1 in 1").
Reused unchanged: `outcomes`, `replyTally`, `isDatedReply`, `benchmark`, `expectedByNow`, `BENCHMARKS_QUERYTRACKER`.
`span` is not used: the page states weeks in words ("7 weeks"), per the brief's rounding (days ÷ 7, rounded, at least 1).
Unit red proofs: every reply to the first nudge; group by the last genre; offers under being read (the partition guard
throws); rounds sorted by id; the same-day nudge rule removed.

## Calls I made

- **One commit for parts A–H, not eight.** The route file wires every part, so seven of eight split commits would not
  have compiled. Each part is its own file (`A26Header`, `A26Next`, `A26What`, `A26Better`, `A26Long`, `A26Compare`,
  `A26DayOne`); the retirement went in the same commit, per CLAUDE.md's "the replaced thing is deleted with its
  replacement".
- **One nudge per query per day.** The harness account has two queries with 40-odd nudge events each on 20 Sep (test
  leftovers); without the rule the card said over 100 nudges sent. Two nudge events on one query on one day are one.
- **A reply belongs to the last nudge before it,** so a nudge's window is (that nudge, the next nudge]; a same-day reply
  reads "Replied the same day" (never "0 days").
- **The header at 1280** is taller than Queries' by the headline's second line: "27 queries, 10 replies" wraps there in
  the reference too. A1 holds top, left and right to ±1px at both widths, height to ±1px at 1512, and at 1280 allows
  exactly one extra line.
- **The Archivist's box.** The shared header's art column was built for a placeholder and has no positioned box, so the
  real image anchored to the page corner. `a26.css` sets it in flow at the mock's 210px (184px tall, inside 227).
- **Design values:** faces, ink, anthracite and cream read from `--sp-*`; the band tints, wells and path ladder have no
  app token and are named once as `--a26-*`.
- **The slim bar** shows "Asked to read more" only once there is a reply (the mock's).
- **The ended line** adds ", {n} you withdrew" when a withdrawal exists.
- **"Asked to read more" in the header** with no reply yet is the oldest-query block; with 1–4 replies, the asked block.
- **"How it works"** mounts the shared `PageGuide` (page `analytics`) with the day-one steps, and the button calls
  `requestPageGuide`. It also opens itself once on a writer's first visit, as every page guide does.
- **"No manuscript"** keeps v24's sentence under a header reading "Analytics" with no buttons.
- **Unqueried** counts any agent on the writer's list, so on a test account with several fixture books it is large
  (34 on the mock fixture: the eight seeded plus other fixtures' crime agents).
- **`tsc` in the worktree:** linking `functions/node_modules` (the emulator's auth step needs firebase-admin) adds four
  type errors in two test files nobody here touched (`QueryCard.test.tsx`, `versionsPageSmoke.test.tsx`). Without the
  link, tsc is exactly the baseline's 7 `functions/` errors. Every commit's tsc was read without it.

## Retired locks (tests/e2e/RETIRED-analytics-v26.md)

AN17-1, 2, 3, 15, 16, 17, 18 · AN21-A1, A2, L1 · AN24-A3, B1, B2, C1, S1–S6, U1, I1, R1, R2 · the v21 and v24 shots
specs. Not carried over: AN17-18's manuscript switch, AN24-R2's bad-date list.

## AN26 locks — red and green

Red: one run with every named mutation applied together (`tests/e2e/an26Mutations.py`) on 76831fafc, then reverted;
L1's mutation did not bite in that run (see below) and was re-run alone on the tree that became 3fe0b6a32. Green: 3fe0b6a32, one run,
15 passed. Ledgers: `ledger-red/`, `ledger-red-l1/`, `ledger-green-final/`.

| Lock | Mutation | Red (failed / readings) — first failure | Green |
|---|---|---|---|
| A1 header | render a local header | 11 / 15 — no shared header | 0 / 15 |
| B1 findings | always show the beyond card | 2 / 17 — beyond card on "all inside" | 0 / 17 |
| B2 early | show findings at 4 replies | 3 / 6 — "four" renders Everyday | 0 / 6 |
| C1 groups | count offers under being read | 2 / 12 — reading 5 vs the sample's 4 | 0 / 12 |
| C2 path | measure each bar against the row above | 3 / 17 — asked bar 391px vs 145px | 0 / 17 |
| D1 rounds | sort by date added | 2 / 12 — asked [4,2,1] vs [1,4,2] | 0 / 12 |
| D2 who | group by any genre | 2 / 8 — one row "Book club fiction 7 of 27" | 0 / 8 |
| E1 timeline | place replies by days ÷ 10 | 14 / 24 — weeks [1,2,4,4,5,…] | 0 / 24 |
| E2 nudges | attribute every reply to the first nudge | 1 / 4 — the later-nudged reply reads "Replied the same day" | 0 / 4 |
| F1 compare | inline 6 as a literal | 2 / 5 — swapped anchors not followed | 0 / 5 |
| G1 words | add "likely" to a foot | 7 / 18 — "likely" | 0 / 18 |
| H1 day one | count the example marks | 1 / 5 — 9 marks on day one | 0 / 5 |
| L1 layout | fix a card to 1400px | 0 / 37 in the joint run (the inserted `min-width` lost to the rule's own `min-width: 0`); alone with `width: 1400px`: 16 / 46 — scroller overflow 931px, 9 cards outside the column | 0 / 46 |

The joint run's reds overlap (A1's local header also removes F1's header line, E1's weeks also move B1's figures), so
each lock's red is shown against its own mutation's reading in the ledger, not as an isolated run.

## Screenshots (`shots/`, frames down the page's own scroller)

- Beside the references: `01-everyday-{1512,1280}-*`, `02-early-{1512,1280}-*`, `03-day-one-{1512,1280}-*`;
  `phone-390-route.png` (the phone app's page — false premise 1).
- Exactly 9 queries: `nine-queries-1512-*` (rounds of 3). 5 replies, no nudges: `five-replies-no-nudges-1512-*`
  (How long takes the full width). No genres recorded: `no-genres-1512-*` ("Not enough queries to any one genre yet.").
  4 replies (Early with replies): `four-replies-1512-*`. 1920: `everyday-1920-*`.

## Finish

- Branch `analytics-v26` (pushed). **Dev serves `index-DAoT-GtE.js`** from `dev/smv31-vv6-cp32-lqmf1-cb15-td57-qc157-an26` @ 8da5b784e
  (= what dev served before, `…-qc157` @ e8224054e with Query Centre v157, + analytics-v26 @ f01862941; clean merge;
  hosting only; the served hash was checked before and after).
- **For Nick — the harness account ("The Smoke Test", `seed-ms-1`), `harness-figures.json`:** see the next section.
- **Links that open unfiltered:** "See those {n} in Queries" (beyond and nudges), "See what went out with those
  queries", "See each round in Queries" (all Queries), "See those {n} in Agents" (Contact list). Each wants a filter on
  its page in a later pack: an id set for Queries, Action = Nudge due, Sort = date sent, and Contact list genre + not
  queried for THIS manuscript (its "Not queried yet" means any manuscript).
- **At 1280:** the headline wraps to two lines (as in the reference), and the header is one line taller than Queries'.
  Nothing else failed to fit: no overflow and no clipping at 1280 in L1.
- **AppFooter:** its mail link is 22px tall (under 24). Out of this pack; L1 measures the page's own parts.

## For Nick — the harness account ("The Smoke Test", `seed-ms-1`, emulator copy of 2 Nov)

Everyday: 52 sent, 31 replies (`harness-figures.json`, read after the same-day nudge rule).

- **findings:** beyond — 14 waiting queries out longer than the slowest reply (11 weeks) · typical — 2 weeks (requests
  2, passes 2: no "sooner"; quiet after 4 weeks) · bestRound — the first round, 11 of 18.
- **rounds:** First 18 (Apr to Jul) 11 asked, 3 waiting · Next 18 (Jul to Aug) 8 asked, 5 waiting · Latest 16
  (Aug to Sep) 3 asked, 11 waiting.
- **whoSaysYes:** one genre group only — Literary Fiction 22 of 51 (one query's agent has no genre); with a personal
  note 1 of 1, without 21 of 51; lead Literary Fiction; unqueried 34 — ⚠️ counted while the v26 fixtures were seeded,
  and they add Literary fiction agents of their own, so the harness's own figure is lower (not read alone).
- **nudgeResults:** 10 nudges (after collapsing same-day repeats; over 100 events before), none answered since; 5 first
  nudges due. The two collapsed queries (Cormac Bligh, Alasdair Crewe) each carry 40-odd nudge events on 20 Sep —
  worth cleaning from the snapshot.
