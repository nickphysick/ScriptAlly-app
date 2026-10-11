# Query Centre v135 — the centred-pair header (three pages) and the badge desk

Branch `v135-header-desk` (worktree `../ScriptAlly-v135`). Not merged.
References: `design-refs/query-centre/query-centre-v135.html`, `query-centre-v135-in-shell.html`, five PNGs in `design-refs/qc-v135/`. All seven SHA256s matched the pack.

Baseline before any edit, on the merged base: `tsc` 0, functions `tsc` 0, `vite build` clean, `build:dev` clean, Vitest 538 files / 8,337 passed / 3 skipped.
(The first baseline run showed one failing file, `functions/src/email.test.ts`: the new worktree had no `functions/node_modules`. Linked, it passes; that is the worktree, not the tree.)
At the end: the same counts, all green.

## 1. False premises, and what I did about each

1. **The reference PNGs do not show the chosen desk.** The pack says the page file's body carries `data-hd=tint` and `data-bp=top`. It does not: neither attribute is set, in the file or by its script, so the in-shell reference and all five PNGs render a **white strip** and a badge at `top: 0` that does **not** break out of the card. I built what the pack's prose and its baked decision 3 say — the pale tint strip, the badge 26 (30) above the card — so the desk differs from the PNGs in exactly those two respects. The comparison shots show it.
2. **The reference's own tint rule draws a 3px ring and an 8px halo and a darker agents title (`#2f4060`).** The pack says 4px, 9px and `--c`. I followed the pack.
3. **"Compact" as a container query on the page sheet: not done that way.** `container-type` on the sheet is layout containment, which re-anchors every `position: fixed` child of a page to the sheet. The shell measures the sheet instead (a layout effect, class `sheet-wide` on `.ws-app` when the sheet is wider than 1440) and the CSS keys on that. Same breakpoint, same subject, no containment.
4. **"The drawing's sizes, as built" and "compact at both reference viewports" disagree at 1512.** The drawings and the header type are sized by the *viewport* (1440) as built, so at a 1512 window the Query Centre's drawing is 326 tall, where the reference draws the compact 253. I kept the sizes as built, as the pack says; only the new values (the gap, the desk) follow the sheet.
5. **"Nothing jumps" cannot hold for the group's x.** The pair is centred as one group and the text track is as wide as its text, so when the count and the faces arrive the group re-centres. Measured at 1512: the Query Centre's drawing moves 4px, the Contact list's 20px; nothing moves at 1280. The header's box, the drawing's y and its size do not change. A5 asserts those and reports the x.
6. **At 1280 the Contact list's pair does not fit at a 56px gap.** Text 518 + 56 + drawing 380 is 954 against a 942 column. The text track gives: the subheader now wraps to two lines and the faces row drops one more disc (5 shown, was 6). With the old 36px gap it fitted.
7. **The desk's rules were in `qcv131.css`, not `qcvBand134.css`.** v134's icon-card rules are retired from there; the new sheet is `qcvDesk135.css`.
8. **The desk does not sit on a band.** It sits on the page, so the badge's halo reads `--ws-page`.
9. **Headroom was needed, and the gap under the Query Centre's header changed.** The flap's shadow reaches about 38px under its outline, and the outline over the middle badge is 21px below the flat edge. At v134's 60 (72) the middle badge's halo sat in the darkest part of the shadow and showed as a pale ring. The desk is now **88 under the header (92 where the sheet is wide)**. This contradicts Part A's "the gap from the header to the next section is kept", on the Query Centre only.
10. **The inner border and the placeholder's dashes are not `color-mix()`.** The house rule bans it at runtime; each court states its 40% and 55% as tokens. A `1.25px` and a `1.5px` border both compute to 1px at a device scale of 1.
11. **The pack's stop condition names `MsOpenHeader`.** There is no component of that name; the Manuscripts header is the `header.ms21-hd` in `Msv21Parts.tsx`.
12. **Header heights now differ between the three pages.** Each is its drawing plus 30 and 34 of padding, and Manuscripts' drawing is 10 taller, so its header ends 10px lower. Older locks held the three to one hairline y; those are retired.

## 2. Base

Shell v2 is not on `main`. The branch is `origin/shell-v2` (`3c4a5f1f`) with `origin/main` (`16ff0db8`, Dashboard v58) merged in. Two conflicts, both additive, both sides kept: `CLAUDE.md` (the next-session lines) and `design-refs/.refhashes.json`. No shell file conflicted. The base has the envelope flap.

## 3. §0 measurements

No shared header component: the three are `QcOpenHeader`, `ContactOpenHeader` and the header in `Msv21Parts.tsx`, each with its own sheet. The same CSS is applied to each. **Lift candidate: the three open headers** (grid, padding, art alignment, the `HeaderSheet` mount) into one shell component. Not lifted here.

Before (the base) → after, at 1512 × 900 / 1280 × 800:

| Page | Columns, gap | Art size | Art drop | padding-bottom | Flat edge y | Art bottom y | Text centre vs art centre |
|---|---|---|---|---|---|---|---|
| `/queries` before | `auto minmax(0,1fr)`, 56 / 36 | 421 × 326 / 327 × 253 | 30 / 24 | 10 | 430 / 357 | 450 / 371 | 257 vs 287 / 220.5 vs 244.5 |
| `/queries` after | `minmax(0,auto) auto` centred, 56 / 56 | same | 0 | 34 | 454 / 381 | 420 / 347 | equal |
| `/agents` before | as above, 56 / 36 | 490 × 326 / 380 × 253 | 30 / 24 | 10 | 430 / 357 | 450 / 371 | 257 vs 287 / 220 vs 244 |
| `/agents` after | centred, 56 / 56 | same | 0 | 34 | 454 / 381 | 420 / 347 | equal |
| `/manuscripts` before | as above, 56 / 36 | 330 × 336 / 260 × 264 (in a 326 / 253 slot) | 20 / 12 | 10 | 430 / 357 | 450 / 370 | 257 vs 282 / 220.5 vs 238 |
| `/manuscripts` after | centred, 56 / 56 | same (slot retired) | 0 | 34 | 464 / 392 | 430 / 358 | equal |

Group midpoint after: 876.0 against a sheet centre of 876.0 at 1512, 760.0 against 760.0 at 1280, on all three.

The desk before: `QcDesk.tsx` with its rules in `qcv131.css`; copy, the hot rule, the month-on-month figure and the ten-week series all from `lib/qcDesk` (`DeskSection`); selection is `onCourt` in `Queries.tsx`, which chooses for "Recently updated" only. None of that changed.

## 4. Locks — QC135

`tests/e2e/qcV135.measure.ts` with `qc135Lib.ts`, at 1512 × 900 and 1280 × 800. Mutations are applied in the page (`QC135_MUTATE`, `tests/e2e/qc135Mutations.sh`).

| Lock | Red on the base | Green on the branch | Red by its mutation |
|---|---|---|---|
| A1 | 6 of 18: /queries @1512 — 333.2 | 18 of 18: the midpoint of (text left, art right) is the page sheet's centre (±2) · /queries @1512 — group 435.0–1317.0, midpoint 876.0, sheet centre 876.0 | 5 of 18: the midpoint of (text left, art right) is the page sheet's centre (±2) · /queries @1512 — group 296.4–1178.5, midpoint 737.4, sheet centr |
| A2 | 12 of 12: /queries @1512 — art 287.0 text 257.0 | 12 of 12: the drawing's vertical centre is the text block's (±2) · /queries @1512 — art 257.0 text 257.0 | 12 of 12: the drawing's vertical centre is the text block's (±2) · /queries @1512 — art 287.0 text 257.0 |
| A3 | 12 of 12: /queries @1512 — -20.0 (flat edge 430.0, art bottom 450.0) | 12 of 12: the drawing's bottom is 30 or more above the flap's flat edge · /queries @1512 — 34.0 (flat edge 454.0, art bottom 420.0) | 12 of 12: the drawing's bottom is 30 or more above the flap's flat edge · /queries @1512 — 18.0 (flat edge 438.0, art bottom 420.0) |
| A4 | 2 of 8: @1512 — /queries normal · /agents normal · /manuscripts normal | /queries center · /agents center · /manuscripts center  | 8 of 8: one column gap on all three · @1512 — /queries 56 · /agents 56 · /manuscripts 56 | 2 of 8: one column gap on all three · @1512 — /queries 56 · /agents 56 · /manuscripts 40 |
| A5 | 6 of 19: /queries @1512 — 296,64 1159×366 · 2 tracks normal | 19 of 19: the loading frame is on the same grid (two tracks, centred) · /queries @1512 — 296,64 1159×390 · 2 tracks center | 12 of 19: the loading frame is on the same grid (two tracks, centred) · /queries @1512 — 296,64 1159×648 · 3 tracks center |
| B1 | 8 of 8: @1512 — 3 cards · 0 badges | 38 of 38: the badge is 64 (±1) and round · you @1512 — 64.0×64.0 | 6 of 38: its top is 26 (±1) above the card's top, its left 16 (±1) in · you @1512 — above 0.0 left 16.0 |
| B2 | 8 of 8: @1512 — 3 cards · 0 badges | 20 of 20: the strip's background is the court's tint · you @1512 — rgb(246, 226, 216) | 6 of 20: the strip's background is the court's tint · you @1512 — rgb(255, 255, 255) |
| B3 | 8 of 8: @1512 — 3 cards · 0 badges | 14 of 14: the inner border is drawn 6 (±0.5) inside every edge · you @1512 — block inset 6/6/6/6 | 6 of 14: the inner border is drawn 6 (±0.5) inside every edge · you @1512 — none inset 6/6/6/6 |
| B4 | 8 of 8: @1512 — 3 cards · 0 badges | 20 of 20: the placeholder sits inside the strip, 12 (±1) from its right edge · you @1512 — right inset 12.0, 549.0–599.0 in 542.0–606.0 | 6 of 20: its vertical centre is the strip's (±1) · you @1512 — 567.0 vs 574.0 |
| B5 | 8 of 8: @1512 — 3 cards · 0 badges | 20 of 20: at least one tile, and one chart svg · you @1512 — 2 tiles, 1 charts | 1 of 20: the month-on-month line is on one line · closed @1280 — "No change since last month" 33.8 tall, line-height 16.9 |
| B6 | 8 of 10: @1512 — 3 cards · 0 badges | 16 of 16: nothing in the card runs past its right edge · you @1512 — scroll 0, spill 0.0 | 3 of 16: nothing in the card runs past its right edge · you @1280 — scroll 2, spill 2.0 |
| B7 | 6 of 20: you @1512 — gba(28, 19, 15, 0.09) 0px 0px 0px 1px, rgba(28, 19, 15, 0.4) 0px 14px 30px -26px | 20 of 20: the pressed card says so, and only it · you @1512 — you true · agent false · closed false | 6 of 20: its outer ring is 2px in the court's colour · you @1512 — rgba(28, 19, 15, 0.09) 0px 0px 0px 1px |
| B8 | 12 of 20: you @1512 — absent → absent · loading count "00" | 20 of 20: the card's box (±1) · you @1512 — 296,542 370×197 → 296,542 370×197 | 6 of 20: the badge is there while loading, blank, in the same box (±1) · you @1512 — 0,0 0×0 → 312,516 64×64 · loading count "" |
| B9 | 4 of 4: you —  img false | 4 of 4: the image is loaded and fills the same box (±1) · you — box 60×50 img 60×50 loaded true | 2 of 4: the image is loaded and fills the same box (±1) · you — box 60×50 img 0×0 loaded true |

Notes on the locks:
- A1's midpoint reading is green on the base as well (text at the column's left, drawing at its right: the midpoint is the centre by accident). Its gap reading and its mutation carry the red.
- B6 allows a tile label to run into the chart column's empty top corner, as the reference's does at 1280 ("responses overdue" ends 10px inside it, above the line). It may not wrap or leave the card's body.
- B9 fills a slot through a review aid, `window.__SA_QC_DESK_ART`, read only in a build that is not production.
- Two faults the locks caught during the build: the art slot's image took its own ratio (60 × 57 in a 60 × 50 box), and the halos sat in the flap's shadow (premise 9).

## 5. Older locks retired or re-pointed

| Suite | Lock | What changed |
|---|---|---|
| `shellV2` | S5 "crosses the flat edge by 12–24", "position unchanged from main" | the open headers' drawings no longer cross; position is v135's; size and "painted above the sheet" still held |
| `contactV151` | H2 drawing's right edge is the desk's | retired |
| `contactV151` | H3 "12–24 below the hairline", "painted over the rule" | re-pointed to "30 or more above the flat edge"; the painted-over reading retired |
| `contactV151` | H4 header ≤ drawing + 44; H5 drawing's top 60 (54) | + 64; 30 |
| `contactV153` | N2 disc-dropping rule | the gap it reasons with is 56 |
| `manuscriptsV21` | H1 hairline y equals the Contact list's; H2 drawing's right edge | retired; floor 260 → 250 |
| `qcV131` | QC1 desk 72 (60) under the header | 88 |
| `qcV1311` | D2 the line's words; D3 tiles 26px | retired (QC135 B1, B2, B5) |
| `qcV133` | H2 drawing's right edge; H3 desk top equals the Contact list's; H4 headroom 60 (54); H6 text x; H7 crosses the hairline | retired / 30 / x not held / retired |
| `qcV134` | K1, K2, K3 (the icon cards) | retired (QC135 B1–B9) |
| `qcV134` | L1 header text x | not held (premise 5) |

Red before this pack and not touched: `qcV131` QC15 (its reference capture is missing).
Not run: the rest of `tests/e2e/`.

## 6. Shots

`reports/qc-v135/shots/`: `compare-header-<page>-<width>.png` (each page's top beside `ref-header-*@2x.png`), `compare-desk-<width>.png`, `compare-desk-selected-1512.png`.

## 7. Open, for Nick

- The Contact list's subheader wraps at 1280 (premise 6). Options: let the gap give at that width, or a smaller hawk.
- The Query Centre's desk is 88 (92) under its header, not 60 (72) (premise 9).
- The drawing slides 4–20px when a page's data arrives at 1512 (premise 5).
- Whether the desk should match the PNGs (white strip, badge inside the card) rather than the pack's prose (premise 1).
