# Analytics v21 — report

Branch `analytics-v21`, cut from **`d3dd2a94`** (what dev served at the start: `dev/main-cl18-todo51-cl181`, `index-BFjZu6hN.js`), which contains Analytics v17 (`A17Frame`), Contact list v17.1, Query Centre v138 (to v138.4) and Submission packages v4 (to v4.1). Ten commits, one per part plus J. Not merged to main.

## False premises (read these first)

1. **"At 1180px of header width and below, the card drops under the buttons."** The mock's rule is a *window* query (`@media (max-width: 1180px)`). At a 1512 window the app's header is ~1160 wide (the sheet is 1256 and the column pays its gutter inside it), so a header-width rule would drop the card in the reference's own 1512 screenshot. Built as a 1180px window query.
2. **"Two columns (one below 1100 of frame width)"** for the reply rows. The mock's 1280 screenshot keeps two columns at a ~948px frame. Built as a 1100px *window* query; at 1280 the frame is ~874 and keeps two columns.
3. **The prompt's `standing` sample (13 / 4 / 1 / 9) partitions by state today**, and the mock's "Being read" fill is sage. "Being read" therefore includes queries whose agent has asked for material the writer has not sent yet (the pink "requested" bucket); the swatch is sage for the whole bucket. The lanes keep their five fills.
4. **"Labels never wrap at 1280"** with the mock's compact name/label columns (118 / 140). At the app's compact size "Asked for a partial" was clipped and "said 8 wks · 2 days over" overflowed its cell. The name column is 132px and the label column is content-sized (each list is one grid, its rows subgrids), so nothing wraps or overflows.
5. **The journey line does not fit the frame below a ~1280 window with the mock's floors.** Five 84px nodes and four 120px gaps need ~900px; the frame is ~874 at 1280 (the line poked into its padding), ~780 at 1180 and ~634 at 1024, where the page scrolled sideways (AN21 L1 found it). Compact floors are 76 / 104 (~800 total), and below 800px of the journey's own width it runs down the page as on the phone (a container query).
6. **"Remove the header row's `min-width: 0`" is not a fault on this page.** Nothing overflows without it at any of L1's widths, so the named mutation leaves L1 green. L1 is proved red by a second mutation instead: the mock's journey floors with no narrow layout, the fault L1 actually found.
7. **The `standing`/"Your move" question.** The bar's "{n} your move" pill counts a request owed or an offer to answer, the Query Centre's own "your move" court; the prompt names the pill but not its rule.
8. **"Reading the numbers: four white cards in two columns"** — the mock draws four across at its full size. The prompt's two columns win (one column below a 900px window).

## §0 Recon

### What v17 shipped, and where v21 reads it

| Mock section | v17 component / model field | v21 |
|---|---|---|
| Header | `PageHeader band bandFixed panel` (header v3's PanelHeader) | `A21Header` (desktop); the phone keeps the band |
| Desk | `Glance` / `v17.glance` | `A21Desk` / `v21.desk` (new) |
| 1 Where the queries got to | `Funnel` / `v17.funnel` | unchanged figure |
| 2 Queries sent | `TrainingLog` / `v17.log` | unchanged, tinted |
| 3 Response rate | `ShareBars` / `v17.rate` | unchanged |
| 4 Replies against the stated window | `ReplyWindow` / `v17.reply` | `A21Window` / `v21.window` (new); v17 figure deleted |
| 5 How long each step takes | `StageGaps`, `Endings` / `v17.waits` | `A21Steps` / `v21.steps`, `v21.endings` (new); v17 figures deleted |
| 6 Firsts and records | `Records` / `v17.records` | `A21Records` / `v21.records` (new) on the desktop; v17's on the phone |
| 7 The campaign over time | `OverTime` / `v17.overTime` | unchanged |
| 8 How things stand | `Lanes` / `v17.lanes` | `A21Stand` (bar, chips) over `Lanes` (filter + sort added) |
| 9 Reading the numbers | `Caveats` / `v17.caveats` | unchanged copy, white cards on the desktop |
| Empty | `A17Empty` + `analyticsExample` | `A21Empty`; both deleted |

Missing from the model, now in `lib/analyticsV21.ts`: `standing`, `windowReplies` (+ `insideShare`, `windowLede`), `stepGaps` (full requested → offer was not measured; v17 had full *sent* → offer), `endings` (silent closes and the offer's agency), the desk's three cards and stamps, the featured record and the quickest pass, latest activity per query, "your move". The model now carries `items` (each query with its dated stages) for them to read.

### Shared parts or page-local

- **Contact list v17.1's header and card are page-local** (`agents/contact/ContactLightHeader.tsx`, `contactV17.css`), and its card *filters*. Analytics' is a page-local copy (`A21Header.tsx`), inert. **Lift candidate.**
- **The empty pages are page-local on all three pages** (`QcEmpty138`, `PkgEmpty4`, now `A21Empty`). **Lift candidates together.**
- **`AppFooter` is shared** (`shell/AppFooter.tsx`) and reused unchanged.
- **Page colour:** `--ws-page` is oat (`rgb(242, 238, 232)`, `#f2eee8`) on this route, matching the mock's `--page`; AN21-C1 reads it.
- **Art:** `hawk-shadow.png` is `public/images/hawk-shadow.png` (the Contact list's); the Archivist is `public/images/analytics/analytics-archivist.webp`, beside the other per-page art folders.

## Derivations added

`lib/analyticsV21.ts` (commit `0f555471`), unit-locked in `src/lib/analyticsV21.test.ts` (29 cases) over the mock's sample (27 sent, 10 replies, 13 / 4 / 1 / 9) run through the real `analyticsModel`, with a fixture entering each branch (unplaced replies, all inside, nothing placed; each featured fallback and none; stamps present and absent; rates below twenty as fractions).

## Calls I made (running unattended)

- **"Compact"** is `.ws-app.sheet-wide` (base = compact), as the prompt says, for the desk, sections, rows, records and empty page. The header's type steps (≤ 1680 / ≤ 1360) and its card's minimum widths are the mock's own *viewport* steps: the prompt states them as window widths and A1 asserts 50px at 1512.
- **Zeros are words.** A zero desk chip reads "None" ("None still waiting"), except offers, which read "No offers so far". The your-move pill is hidden at zero; the waiting pill says "None waiting".
- **Stamps:** "+n this month" is omitted at zero; "n days quicker/slower" is omitted when either 90-day window has no reply, or when the two medians are equal.
- **The Median wait unit** names its population under five ("days, from 4 replies"), the thin-sample rule's form for a statistic.
- **The phone (≤ 760) keeps v17's band** by mounting `PageHeader` there only (a live width hook), rather than mounting both and hiding one, so the document never holds two `data-page-title` headings.
- **The phone's reply rows:** the right cell sits under the track's right end (the prompt), not beside the name (the mock's phone layer).
- **The workspace's art slot ships empty**: a dashed box with no caption, as v17's slots did ("Hawk art in flight" is the mock's caption, not product copy).
- **The featured card's disc** shows the initials of the name beside it (the agency): "The Hollis Agency" → "HA", as the mock.
- **The journey's range** reads "all at n days" where min equals max.
- **The reply axis** writes "wks" on its last tick only; three "N WKS" labels collided on a narrow after-column track.
- **Lede for a single dated reply** reads "1 of the 1 who has replied did it inside that time." Literal; not reworded.

## Locks

`tests/e2e/analyticsV21.measure.ts` — AN21-A1 … L1, one ledger each under `reports/analytics-v21/ledger/`. Fixture: the harness account's "The Smoke Test" (`seed-ms-1`, 51 queries). I1 seeds and removes `seed-an21-empty` (`tests/e2e/seedAn21.mjs`); the account was checked empty of it after every run.

### Red first, then green

| Lock | Red on the base (`d3dd2a94`) | Named mutation | Mutation result | Green at HEAD |
|---|---|---|---|---|
| A1 header | 4 of 4 failed (no light header) | Restore the navy panel | RED, 4 failed | 32 readings, 0 failed |
| A2 card | 2 of 2 failed | Paint "Ended" anthracite | RED, 4 failed | 30, 0 |
| A3 ring | 2 of 2 failed | Draw the gap in rust | RED, 2 failed | 12, 0 |
| B1 desk | 3 of 3 failed | Hard-code "+3 this month" | RED, 9 failed | 36, 0 |
| C1 tints | 24 of 60 failed | Clip the section instead of the shadow | RED, 12 failed | 60, 0 |
| D1 window | 2 of 2 failed | Draw "over" from the track's start | RED, 6 failed | 82, 0 |
| E1 steps | 4 of 4 failed | Colour every gap navy | RED, 2 failed | 28, 0 |
| F1 records | 2 of 2 failed | Restore the longest-full-read row | RED, 2 failed | 8, 0 |
| G1 workspace | 2 of 2 failed | Count chips from a second derivation | RED, 2 failed | 10, 0 |
| I1 empty | 7 of 15 failed | Count the example | RED, 2 failed | 15, 0 |
| L1 overflow | 0 of 72 (the base never overflowed) | Remove the header row's `min-width: 0` | **GREEN — a no-op** (false premise 6) | 72, 0 |
| L1 (second) | — | The mock's journey floors, no narrow layout (the fault L1 found on an intermediate v21 build at 1180 and 1024) | RED, 12 failed | — |

Mutations were applied as source patches in this worktree, built with `build:dev`, run alone, and restored from path-named backups (`reports/analytics-v21/mutation-proofs.jsonl`).

### Retired and rewritten

`tests/e2e/RETIRED-analytics-v21.md`: AN17-4, -5, -6, -10, -11 and -14 retired whole; AN17-15, -16 and -17 rewritten (the law kept, the subject moved); `/queries/analytics` moved from `BAND_ROUTES` (now empty) to `OWN_HEADER_ROUTES`.

### L2 — no regression

Run on v21 and on the untouched base (`d3dd2a94`, its own worktree and port), the same thirteen suites: QC138, v138.1–v138.4, CL17 and CL17.1, PK4, header v3, header panel v2, page header v2, the quiet bar and AN17's kept cases.

- **Red on both, not this pack's** (identical readings on the base): AN17-17's two disc readings (header v3 put the band in the shared panel); headerPanelV2's `/manuscripts/packages` panel readings (P1, P4, P7) and the comps phone reading, and its floor; P7 at 390 (16 readings on both); pageHeaderV2's three `/agents` cases (the switcher, and the add door, whose `.ws-ms-add` is disabled — a 10-minute click timeout on both); and headerPanelV2 P2's dashboard box, 11px right of its stored baseline — it passed earlier in the night on both builds and failed later on both, so it is account or machine state, not code.
- **contactV171 D2** failed on the base and passed on v21: it reads the account's Housekeeping gaps, which change between runs.
- **New on v21, all from Analytics leaving the panel, and re-pointed:** headerPanelV2 P1/P4/P7 (Analytics joins `LIGHT_HEADER`; its phone page keeps the panel, so P7 at 390 still reads it), P5's drawing floor (8 → 6), P9 (retired); headerV3 H1/H4 (Analytics is a light-header route; H4's mutation now targets Discover) and H6's floor (8 → 6). Re-run on v21: headerV3 green; headerPanelV2 red only on the base's own readings above.

## Gates

Baseline at `d3dd2a94`: tsc clean; `build:dev` and the production build clean (no CSS diagnostics); Vitest 591 files, 8,887 passed, 3 skipped. At each part's commit: tsc clean, production build clean, Vitest 592 files, 8,916 passed (twice the run exited 1 on the known `Timeout calling "onTaskUpdate"` reporter error with every test passing — read from the counts, as CLAUDE.md says).

Part J's gate is recorded with its commit. The final consolidated run at J's source: AN21 A1–L1 all green (385 readings: A1 32 · A2 30 · A3 12 · B1 36 · C1 60 · D1 82 · E1 28 · F1 8 · G1 10 · I1 15 · L1 72); AN17's ten cases green except AN17-17's two pre-existing disc readings; the I1 fixture removed (0 queries left on `seed-an21-empty`).

## Screenshots

`reports/analytics-v21/shots/` (taken by `tests/e2e/analyticsV21Shots.measure.ts`, `AN21_SHOTS=1`), on "The Smoke Test":

- beside each reference screen, at 1512 and 1280: `01-top`, `02-stages`, `03-replies-window`, `04-steps`, `05-records`, `06-how-things-stand`, `07-reading`, and on the empty fixture `08-empty`, `09-empty-lower`, `10-empty-ways` (also at 390);
- the page cut to one query (the thin-sample state, through the dev review aid): `one-query-top-1512` and sections 4–6;
- the top at 1920 and 1024: `top-1920`, `top-1024`.

From looking at them, two fixes went into J: a desk figure in words ("No replies") steps down to 26px so the rows stay in the card, and the desk is one column below a 1100px window (at 1024 each card was ~220 wide and every row clipped).

## Integration and deploy

- **Dev moved overnight.** At the start dev served `d3dd2a94` (`index-BFjZu6hN.js`); by the deploy it served `dev/main-cl18-todo51-cl181-qc1385` = `387a664a` (Query Centre v138.5, `index-OpIsaxaB.js`), which contains the base.
- **Integration branch `dev/main-cl18-todo51-cl181-qc1385-an21`** = `387a664a` + `analytics-v21`, merge `504fe4ad`. Only `design-refs/.refhashes.json` conflicted (both packs enrolled refs; both kept, 368 refs check). CLAUDE.md auto-merged.
- **Gates there:** tsc clean; production and dev builds clean; Vitest 593 files, 8,922 passed (the one file that first failed to load, `functions/src/email.test.ts`, was the new worktree missing `functions/node_modules`; linked, 9/9).
- **Locks there** (its own `vite preview`): AN21 all green; QC v138.5's locks green; headerV3 green; AN17, headerPanelV2 and pageHeaderV2 red only on the base's own readings listed under L2.
- **Deployed** hosting only, `--config firebase.dev.json --project scriptally-dev`, from the clean integration worktree, after re-checking dev still served `index-OpIsaxaB.js`. **Dev now serves `index-DQqNyNdX.js`.** AN21 run against the deployed site (`SA_E2E_BASE_URL=dev`): 11/11 green, 385 readings. No rules or functions changed. Not merged to main. `contact-list-v18-2` was pushed by another session during the run; dev did not serve it, so nothing of it was overwritten — and it is not in this deploy.

## For Nick

- **What didn't fit at 1280, and what I changed for it.** The journey's floors (84 / 120 → 76 / 104) so it stays one line; the reply rows' name column (118 → 132) and a content-sized label column; the desk is fine at 1280 but goes to one column below 1100. Nothing else needed a change at 1280.
- **The harness account's `standing` and `insideShare`.** "The Smoke Test" (`seed-ms-1`, 51 queries): Still waiting 20 · Being read 18 · Offer 1 · Ended 12; inside the window 88% (21 of 24 placed replies). "Harbour of Glass" (the account's default, 8 queries): 3 · 3 · 0 · 2; 100% (1 of 1).
- **Replies with no stated window, not placed in Part D:** none on "The Smoke Test" (all 24 dated replies come from agencies that state one); **3 of 4** on "Harbour of Glass".
- **Pre-existing reds you may want to know about** (not touched): AN17-17's disc readings since header v3; header panel v2's packages and comps readings since packages v4 and comps v25; pageHeaderV2's `/agents` cases; and P2's dashboard baseline, which has drifted 11px.
- **Two placeholders ship empty, as before:** the How things stand art slot (a dashed box, no caption) and v17's perches on the phone.
