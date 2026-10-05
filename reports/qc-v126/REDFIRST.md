# QC126 — red first (5 Oct)

Every lock run against the unchanged build (`b6fa05ae` + the enrolled refs, `build:dev`, preview on
127.0.0.1:4413), before any product edit. One representative failing reading per lock; the full logs
were the four runs below. **Every lock read red on its subject.** QC126-2 is the only source lock; the
rest are rendered.

| Lock | Red reading (unchanged build) |
|---|---|
| 1 shell | page `rgb(244, 240, 234)` (the QC's ground-mode cream), sidebar `rgb(231, 227, 220)` — 16 rows across 4 widths |
| 2 no stragglers | `--fc-page: #f5f1eb`, `--dash-page`, `--qcard-page`, `--msv12-page`, the `livingExhibit` fade (6 lines) |
| 3 band | the band exists: `null` at all four widths |
| 4 rhythm | band → desk / desk → carousel / carousel → banner: no band, no carousel, no banner (`—`) |
| 5 carousel | `exactly 8 cards — 0` |
| 6 desk ≠ list | population `rows 83 bands 0`; `cards 0 desk 13` |
| 7 one card | carousel cards `[]` (no carousel) |
| 8 workspace | banner `null`; hawk/workspace `null` |
| 9 sticky | `{"found":false,…}` |
| 10 full width | `no rail in the DOM — 1` (the rail is mounted); workspace inner `NaN` |
| 11 footer | `found false` (desk at 288.95 / 950.09) |
| 12 tab | no tab (`—`); **B** opens nothing |
| 13 drawer | width `NaN vs 780`; no dim, no header |
| 14 grows down | `NaN → NaN (line 0)` |
| 15 pill labels | every pill `undefined` |
| 16 time control | `null in null`; no separator, no today button |
| 17 bars | `population: over 0 run 0 today NaN` |
| 18 Escape ladder | preconditions false (no drawer, no popover) |
| 19 sort + group | stage headings `["","",""]` (no drawer: the rail's own unnamed groups); No grouping `3 groups` |
| 20 one door | `{"mode":null,"dock":false,"others":0}` from all four doors |

## Corrections made to the locks while proving them red (each before any product edit)

- **Unbounded clicks.** Playwright's `actionTimeout` is unset here, so a `.click().catch()` on a missing
  subject waited the whole 900s test budget; QC126-14/15/16/18/19/20 died before writing readings. Every
  click now carries `{ timeout: 4000 }`, and those six were re-run.
- **A probe-name collision.** The retiring rail already carries `data-qcv="be-head"`, `be-title`,
  `be-hawk`, `be-row` and `be-group`, so QC126-14 first read the RAIL (`122 → 122`, hawk 760/724) on a
  build with no drawer — a plausible number about the wrong subject. The drawer's probes are `bvd-*`;
  re-run red at `NaN`.
- **QC126-7's list of today's card files** named two of four (`PaneCard.tsx` and `queries/QueryCard.tsx`
  were missing), so it would have read a pre-existing file as a fork.
- **QC126-20's "no other dialog"** counted the page guide (`role="dialog"`, a standing non-modal card); it
  is excluded by its `data-qcv="guide"`.
- **QC126-2** allows `queryDrawer.css`'s `--qad-page` BY NAME: it is in `queryActions/**`, which the pack
  forbids changing.
- **QC126-14's growth check was a tautology** (`near(x, fh + (x − fh))`) as first written; it now
  requires the growth to be at least the filter line and at most the line plus 16px.
