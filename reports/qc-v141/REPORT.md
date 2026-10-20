# Query Centre v141: the "where they stand" breakdown, Status by default, a glyph jump row and the pinned band to match

Branch `query-centre-v141` (worktree `~/ScriptAlly-qc141`), six commits on `6a7a0715`. Not merged to main.
Ref: `design-refs/query-centre-v141/` (the mock and its eleven screens, SHA256s checked against the pack).

## 1. False premises and deviations

1. **The Filters menu already had a section headed "Where it stands".** It is v140's list of eight status rows
   (Queried … No reply). The pack's new four-set section takes that heading. The old section is renamed **"Status"**:
   its rows are statuses, and Status is now the default grouping. Nothing else about it changed.
2. **"With you" is smaller than the "Your move" quick pick, and that stays (17 against 53).** `isYourMoveRow` (v138 §D)
   counts an agent-court query past its date as the writer's move. The four sets put those queries in **Gone quiet**,
   as the pack defines it. The quick picks are unchanged, as the pack asks.
3. **Closed includes Withdrawn and Signed.** The pack's Closed covers "closed in any way", but `tileCourt`, the
   existing court function, returns no court for those two. The four sets therefore use their own function,
   `whereItStands`, which puts them in Closed. Without that, the four sets would not sum to the hero's total.
4. **No response was not the only glyph shared under Status.** No response, Withdrawn and Passed all drew the
   circle-with-a-line; Revise & resubmit drew Full requested's; Resubmitted drew Full sent's; Signed drew Offer's.
   L6 ("no two glyphs' SVG markup is identical") would fail on any account with one of those pairs. Every status now
   has its own glyph (`stageKeyOfStatus`, lib/qcBandArt). The pack names the dashed clock for No response, and it is
   the mock's own svg. The other four are mine, in the stage glyphs' grammar:
   - R&R and Resubmitted: their stage's disc with a ring cut out;
   - Signed: Offer without the dashed ring;
   - Withdrawn: a diagonal stroke in place of Passed's level one.

   **Nick to confirm the four.**
5. **The overflow menu's glyph column is 32px, as the pack says. The mock draws 24px.** The pack's prose wins.
6. **L9's mutation needed `max-height: none` as well.** The card's `max-height: var(--hero-stack-h)` clamps a fixed
   220px height back to 179, so a 220px height alone left L9 green. The break used is `height: 220px;
   max-height: none`.
7. **L8, as written, could not see the collision it exists for.** With the `tight` class disabled at 1280:
   - no two band children overlap;
   - no two sets overlap (they sit 4px apart);
   - but "Gone quiet" and "Closed" run out of the breakdown and over Heard back.

   L8 now also holds every set inside the breakdown and clear of the band's other children. With that, the break
   goes red.
8. **The sets' padding overlaps by design.** The mock gives each set `margin: -3px -9px` against 9px of padding, so
   neighbouring padding boxes overlap whenever the sets are close. `tight` and L8 therefore measure the sets' ink:
   the box less its side padding.
9. **QC139 C1 never tested its claim.** The saved e2e session carries a `qh.qc.view` (written at sign-in), so the
   old-key migration it names was never read. It passed only because "Who it's with" was the default. Part C made
   it red. It now clears `qh.qc.view` first, so the migration actually runs, and it is green.
10. **The "With agents" label in the compact card.** The mock's DOM says "With the agent" at every width, while its
    screens show "With agents" at 1280 and 1512. I followed the pack: "With agents" in the compact header (sheet up to
    1440), "With the agent" in the wide one.
11. **Dev moved twice during the build.** The base (`6a7a0715`, `…-hs1`) was what dev served at the start. By deploy
    time dev served `…-hs1-hc1-sil2-wf1` (Help centre v1, Smart Import loader v2, wording fixes), so the
    integration branch is cut from that (§9).

## 2. Base tip

`6a7a0715` — `dev/main-cl18-…-qc140-cl192-qc1401-hr1-hs1`, served as `index-D5wjLmfX.js` at the start. It carries
Query Centre v140.1 and Header rules v1.1.

## 3. The four sets

**`whereItStands(r)` in `src/lib/qcSummary.ts`**, beside `courtOf` and `tileCourt`. `whereCounts(rows)` and
`WHERE_LABEL` are with it.

- **With you:** the court is the writer's or an offer.
- **With the agent:** the agent's court, and not `pastExpected`.
- **Gone quiet:** the agent's court, and `pastExpected`. That is the date the due ring and "Overdue since …" read.
- **Closed:** every closed status.

Seed counts on the harness account (87 queries):

| With you | With the agent | Gone quiet | Closed |
|---|---|---|---|
| 17 | 17 | 36 | 17 |

## 4. "With the agent" against "Waiting to hear back"

**Equal: 17 and 17, the same ids.** `waitingRow` (lib/qc140) is `court === "agent" && !pastExpected`, which is the
same predicate as `whereItStands`'s "agent". Measured in the Filters menu: "Waiting to hear back" reads 17 and
"With the agent" reads 17. The quick pick is unchanged.

## 5. Analytics and sent-per-week

**No.** Analytics charts **"Queries sent each month"** (A24S3); it has no weekly series. The weekly chart is gone from
the Query Centre and was not moved anywhere. `lib/qcSentWeeks` is untouched: `bandFigures` still computes its weeks,
and nothing draws them now.

## 6. Per part

- **A — the filter (`6b319e75`).**
  - `Qc138Filters.where` (one set or null) is the one state; `matches138` ANDs it with the other filters.
  - It is counted by the Filters chip, cleared by Clear all, persisted for the visit (validated in
    `sanitiseQcVisit`) and shown as an applied chip.
  - The Filters menu gains the single-select "Where it stands" section (`WhereMenuSection`).
- **B — the hero card (`42ccf1c0`).**
  - `QcWhereCard` ports the mock's `.qsc`. It is placed by the Header rules tokens: `--hero-right-w` wide, at most
    `--hero-stack-h` tall, centred on the stack.
  - Measured, equal to the mock's rendered card at each width:
    - 1280 and 1512: 332 × 179, with 22px counts, 15px labels and an 84px ring;
    - 1920: 370 × 201, with 25px counts, 16.5px labels and a 92px ring.
  - A row sets the filter (pressed again, clears it) and scrolls the list's top into view unless pinned. Hover lifts
    the card 3px.
  - `QcWeekChart138.tsx` and its `.qc138-wk*` rules are deleted.
- **C — Status by default (`3eb012da`).** `DEFAULT_QC_GROUP = "status"`. The chip has no "on" state and no "×" under
  Status, and the "×" on any other grouping returns to Status.
- **D — the jump row (`309e7eaa`).**
  - Glyph mode (Status, "Who it's with"): 44 × 40 buttons with a badge and the name on hover or focus.
  - Name mode (Next action, Package): names and counts, no icon.
  - A glyph per status (§1.4); the closed glyph for "Who it's with"'s Closed.
  - The "+N more" menu is a grid with a 32px glyph column. Package rows have no glyph and no column.
- **E — the pinned band (`e90c2587`).**
  - "{N} queries sent" starts at the first jump button's x (264).
  - The breakdown sits between hairlines: a 5px bar in the band's palette, then four set buttons on the one filter.
  - Then Heard back with "{n} of {total} agents", then "+ Log a query".
  - The overdue pill and the weekly bars are deleted.
  - `tight` / `tighter` are measured, not breakpoints. On the harness account: full at 1512 and 1920, tight at 1280,
    as the mock's screens 08–10 show.

## 7. Locks: `tests/e2e/qcV141.measure.ts` (L1–L9) and the L10 suites

Each lock asserts its population first, at 1280 × 800 and 1512 × 900. The breaks are in `tests/e2e/qcV141Mutate.sh`,
recorded in `mutations.jsonl`.

L2 and L3 derive the sets from each row's own `data-court` and `data-due`, never from the filter they test.

| Lock | Red on the base (6a7a0715) | Red under its break | Green on v141 | Green on the integration build |
|---|---|---|---|---|
| L1 sum | card absent (population null) | drop-closed: 70 vs 87 | 10/10 | ✓ |
| L2 disjoint | 22 failed readings | overdate-you-quiet: 38 shown vs 36 | 22/22 | ✓ |
| L3 one filter | 10 failed | card-own-state: 87 vs 36 | 18/18 | ✓ |
| L4 export | 6 failed | export-ignores: "Export all 87" vs 36 | 6/6 | ✓ |
| L5 default | "Who it's with" | default-attention: "Who it's with" | 8/8 | ✓ |
| L6 glyphs | 3 duplicate drawings; svgs in Package | nr-shared: 1 duplicate | 16/16 | ✓ |
| L7 menu | 6 failed | no-column: badge 567 vs name 557 | 10/10 | ✓ |
| L8 band fit | band absent | no-tight: sets over Heard back | 10/10 | ✓ |
| L9 header | card absent | fixed-220: 220 vs 179 | 10/10 | ✓ |

L7's first break run died in sign-in setup; it was re-run and went red as recorded.

**L10, on the integration build (`f52c0466`):** all green.

| Suite | Result |
|---|---|
| QC140 | 15/15 |
| QC140.1 | 5/5 |
| HR1 | 3/3, with HR1-8's reference recaptured from the dev tip 0ed25ed7 |
| CL19 | 15/15 |
| CL19.1 | 9/9 |
| CL19.2 | 9/9 |
| QC139 | 14/14 |

**Retired or re-pointed, each with a comment at the assertion:**

- **QC140 A2:** "no two neighbouring badged groups share a mark", "each button's mark is its band's" and "the badge is
  drawn on the badged groups" no longer apply to the buttons, because Next action is name mode (§D3). Re-pointed: no
  button carries a mark, and each "+N more" row's mark is its band's.
- **QC140 C2:** "no court words" is retired, since the band carries the four sets. What survives: the band never names
  the jump row's groups ("Your move", "Waiting").
- **QC140 C3:**
  - "asked for more" now reads "{n} of {total} agents", held only at full fit, because `tight` drops it (§E);
  - "overdue = the reply-date switch's count" and "pressing it shows that many" are retired with the pill.
- **QC140 D1:** "pinned: the band's disc on → the switch and the pick on" is retired with the disc. QC141 L3 holds the
  band's one state.
- **QC139 C1:** re-pointed so it exercises the migration it names (§1.9).

**Gates.**

- Each part: tsc 0, `vite build` 0 with no warnings, `build:dev` 0, Vitest 619–620/620 files.
- The integration build: tsc 0, both builds 0, Vitest 634/634 files and 9,329 tests. The functions tests need
  `functions/node_modules` linked into a fresh worktree; without it, three fail to import `@anthropic-ai/sdk`.
- Baseline before any edit: tsc, both builds and Vitest 618/618, all green.

## 8. Screenshots — `reports/qc-v141/shots/`, matching screens 01–11

`01-unpinned-1512` · `02-unpinned-1280` · `03-unpinned-1920` · `04-unpinned-gone-quiet-1512` ·
`05-jump-glyph-hover-1512` · `06-jump-package-menu-1280` · `07-jump-action-menu-1512` · `08-pinned-1280` ·
`09-pinned-1512` · `10-pinned-1920` · `11-pinned-gone-quiet-1512`, plus `12-filters-menu-1512` (the new section).

## 9. Integration branch and dev

- **Integration branch:**
  `dev/main-cl18-todo51-cl181-qc1385-an21-cl182-qc1386-db60-cl183-an24-cl1831-an241-db601-cl1831b-cl1832-cl1833-cx28-qhnet-td52-dv1-qc139-dv1b-cl19-cl191-qc140-cl192-qc1401-hr1-hs1-hc1-sil2-wf1-qc141`.
- **Its base:** dev's own branch at `0ed25ed7`. That tip builds to `index-8VnU8F6o.js`, exactly what dev served at
  cut-over.
- **The merge** is `f52c0466`. Its one conflict was `design-refs/.refhashes.json`: both sides enrolled refs, and
  both lists were kept (678 checked).
- **Dev build:** deployed 20 Oct from a clean detached checkout of `53b2f00c`. Dev served `index-8VnU8F6o.js`
  immediately before, and serves **`index-DTpuR3x0.js`** after. Hosting only; no rules or functions changed.

## Not touched

`src/components/manuscripts/**`, the Contact list, the header rule tokens (read only), `lib/qcSentWeeks`, and phone
layouts: every v141 rule sits in a `min-width: 768px` block, or on desktop-only markup.

The shared account's `todoPrefs.queries.guide` was read before each run and put back after.
