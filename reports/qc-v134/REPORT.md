# Query Centre v134 — report

Branch `qc-v134`, three commits, deployed to dev from the branch. Not merged to `main`.

Reference: `design-refs/query-centre/query-centre-v134.html` and eight PNGs in `design-refs/qc-v134/`. All nine SHA256s matched the brief.
Locks: `tests/e2e/qcV134.measure.ts` (N1–N3, K1–K3, B1–B3, L1). Proofs: `reports/qc-v134/mutation-proofs.json`.

## 1. False premises and differences from the brief

1. **Contact list v15.3 has not landed.** `main` was at v15.2 when the branch was cut. The hero number and the faces follow this brief's numbers.
2. **The hero number changes two titles.** The brief says the title's figure and its derivation are unchanged, and that `.hn` equals the page's query count. The old title wrote "One query out" and "No queries out" in words. The number is now always a figure: "1 query out", "0 queries out".
3. **N2's fixtures cannot be shown on the harness account.** Every court there is full (13 / 56 / 13), so the "empty groups lend no slots" rule cannot fail on the page. Fixture A (4 / 19 / 4) and fixture B (0 / 2 / 1) are unit tests in `qcFaces.test.ts`, and the "fill empty slots" mutation is proved red there. The rendered N2 is proved red by a second mutation (a fourth with-you disc).
4. **The faces row cannot overflow, so there is no drop-discs rule.** The text column is as wide as its widest child, and the title above the faces is always wider than eight discs and "+N more". N2 asserts the row ends inside the text block and that nothing overflows sideways.
5. **The discs are mouse-only.** The brief makes them `aria-hidden` and clickable. An element hidden from assistive technology should not take keyboard focus, so they have `tabindex="-1"`. A keyboard user reaches the same queries from the list.
6. **A disc opens the query's card, not the action drawer.** "Opens that query in the existing drawer" is taken as what a list row opens: the centred query card. N3's mutation (open the agent card instead) confirms that reading.
7. **`QcList132.tsx` is on the do-not-touch list and has one word added.** `useTip`, the popup the material tiles use, was not exported. It is now, so the faces show the same popup. Nothing else in that file changed.
8. **The stamp and the trend had no other user, so their code is deleted** rather than kept (§4).
9. **Month on month is measured from the end of the last London calendar month**, not four weeks ago as the stamp was.
10. **A lock I should have caught in v133.1.** `qcV96` QC13 (the page guide must not sit over the desk at 860px of window height) has been red on `main` since v133.1 moved the desk down. I did not run that suite then. It is still red; the guide is outside this brief (§5).

## 2. §0 findings

### 2.1 The Contact list pieces mirrored

| Piece | Where on `main` | Values taken |
|---|---|---|
| Desk card | `shell/desk/DeskCard.tsx`, `desk.css` | white, radius 16, the hairline-and-drop shadow, padding 50 / 24 / 16 (42 / 18 / 16), disc 64 (54) at top −28, left 22 (−24, 16), 5px page-colour halo, line 21 / 34 (17 / 28), chart 112 × 38 (84 × 30), 1.8px line, 7% fill, 3.2 end dot, caption 10.5 (9.5) |
| Band | `contactV14.css` / `contactV15.css` | `#e9e6e0`; full bleed by a 100vmax spread shadow clipped to the band's height |
| Banner | `.cl15-ban` in `contactV15.css` | blush `#f3ddd2`, the same full-bleed `::before`, the arrow's path and its 1px overlap, min-height 136 (112), padding 36 / 34 (28 / 26) |
| Hero number, faces | not on `main` | none; the brief's numbers |

Differences by this brief: court colours in place of ink on the disc and chart; a neutral grey arrow where the Contact list's is green or brown; 30px (24) banner type where the Contact list's is 38 (29); 104 (92) under the banner where the Contact list has 76 (64).

### 2.2 The desk's data

Month on month is `monthChange` in `qcCourtHistory.ts`: the court's count now, minus `countAt` at the last instant of the previous London calendar month. Both are points of the running count v131.1 built from each query's own dated history. Nothing is estimated: a query whose move into today's stage is undated is in "now" and in no earlier point, exactly as in the series.

The chart draws `courtSeries` unchanged: ten weekly points, the last of which is now and equals the card's figure (K3).

On the harness account: with you up 1, with agents up 1, closed no change. No card is down, so the "down" arrow's colour is covered by the unit path and the CSS (one rule, no per-direction colour), not by a rendered reading.

### 2.3 The faces' data

All from `QcRow` (`lib/qcSummary.ts`): the court is `tileCourt(row.status)`, the desk's own classification; `agentName` and `initials`; `lastMs` for latest activity; `stageStartMs` for the day a query closed; `expectedMs` for urgency. The hero number is `qcLivingRows.length`, the manuscript scope's count, and the faces read the same rows.

A withdrawn or signed query is in the hero number and in "+N more", and on no disc, because it sits in no court. That is why the harness page reads 83 with 13 + 56 + 13 = 82 on the desk.

## 3. Locks retired and re-pointed

Full reasons are in `tests/e2e/RETIRED-query-centre-v134.md`.

- **Retired:** `qcV1311` D1 (card box), D4 (stamp), D5 (trend).
- **Re-pointed:** `qcV1311` D2; the `qcV131` opener and QC1; QC133 H1 and H6.
- **Unchanged and passing:** `qcV1311` D3 and D8; v132's R1 (the section's internal geometry did not move); QC133 H2–H5 and H7, so the header's geometry stands.
- **Censuses:** none changed. `/queries` was already in `OWN_HEADER_ROUTES`.

## 4. What was deleted, and what still uses the old code

Nothing else used the stamp or the trend. Deleted: `stampText`, `courtChange`, `trendTip`, `trendLabel`, `TREND_UNIT`, `DeskSection.stamp`, and their CSS, including the `.qc13-tip` tooltip. `trendStartLabel` stays: the chart's caption reads it. The phone's desk (`QcCourts`) never used either.

## 5. For Nick

1. **The page guide overlaps the desk at 860px of window height** (`qcV96` QC13, red since v133.1). The header is taller and the desk lower than when the guide's placement was written. It needs a ruling: move the guide, or accept the overlap at that height.
2. **"1 query out" and "0 queries out"** replace the worded titles (§1.2).
3. **The discs are not reachable by keyboard** (§1.5).

## 6. Lift candidates for the `shell/` pack

| Query Centre | Contact list |
|---|---|
| the desk card in `QcDesk.tsx` (court colours, two tiles, selection) | `shell/desk/DeskCard` |
| the band (`qcvBand134.css`) | the next-step band |
| the banner (`.qc134-ban`) | `.cl15-ban` |
| the hero number and faces in `QcOpenHeader` | v15.3's, when it lands |
| `useTip` (the styled popup) | none yet |

These join `QcOpenHeader` / `ContactOpenHeader` and v132's six.

## 7. Each lock, red and green

All ten pass at 1512 × 900 and 1280 × 800, with no sideways overflow.

| Lock | Mutation | Red reading | Green |
|---|---|---|---|
| N1 hero | render the number at 72 | "the number is 72px", 52 out | 83, at 124 / 98; words 42 / 34; one line |
| N2 faces (unit) | fill empty slots from other groups | `qcFaces.test.ts` fails | fixtures A and B pass |
| N2 faces (page) | a fourth with-you disc | "the groups, in order, each up to its cap" | you ×3, agent ×3, closed ×2, "+75 more", no key |
| N3 spacing | open the agent card instead | "the query's card opened": not found | 16 above, 22 below; popup is the agent's name; the query's card opens |
| K1 shape | paint the discs ink | disc `rgb(42, 58, 82)` against `rgb(176, 96, 62)` | three court-coloured discs 28 / 24 above; no stamp |
| K2 content | colour "up" green | `rgb(79, 122, 75)` against ink 58% | lines, tiles and a neutral month on month |
| K3 chart | plot weekly arrivals | last point 1 against the figure 13 | 112 × 38 / 84 × 30, ten points, court stroke |
| B1 band | confine it to the column | page colour at the sheet's edges | tinted edge to edge; 64 / 52; 72 / 64 |
| B2 banner | restore "chaos" | "the text, exactly" | two exact lines; 56 / 48 above; 104 / 92 below; arrow centred |
| B3 hawk | the Contact list's 76 gap | hawk's top 5.1px above the banner's bottom | clears by 22.9 (1512) and 10.9 (1280) |
| L1 no jump | shorten the desk placeholder | card height 212.7 → 245.7 | every box equal loading and loaded |

Measured heights: header 337 / 264; desk cards 245.7 / 221.6; band 587.5 / 571.5; banner 148 / 116.4.

## 8. Gates

| | Baseline (`036289e7`) | Branch |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| Production build | clean | clean |
| Dev build | clean | clean |
| Vitest | 540 files, 8,456 passed, 3 skipped | 541 files, 8,467 passed, 3 skipped |

e2e: QC134 10 of 10. The older Query Centre suites (`qcV133`, `qcV132`, `qcV131`, `qcV1311`, `qcV126`, `qcV96`) on the Phase 3 build: 51 passed, 25 skipped, 5 failed. One was `qcV131` QC1, re-pointed and now passing. The other four are QC126-2, QC15, and `qcV96` QC13 with its closing case, all red before this pass.

## 9. Shots

`reports/qc-v134/shots/`, each beside its reference in `design-refs/qc-v134/`:

| Shot | Reference |
|---|---|
| `header-desk-1512.png`, `header-desk-1280.png` | `ref-header-desk-1512@2x.png`, `ref-header-desk-1280@2x.png` |
| `faces-hover-1512.png` | `ref-faces-hover-1512@2x.png` |
| `desk-selected-1512.png` | `ref-desk-selected-1512@2x.png` |
| `band-1512.png`, `band-1280.png` | `ref-band-1512@2x.png`, `ref-band-1280@2x.png` |
| `banner-1512.png`, `banner-1280.png` | `ref-banner-1512@2x.png`, `ref-banner-1280@2x.png` |

The reference's header is the v133 mock; the built header keeps v133.1's geometry, as the brief says.

## 10. The merge to `main` (9 Oct)

Contact list v15.3 landed on `main` before the merge. It gave the Contact list's header 30px of top padding, so H3 (the equality with `/agents`) went red on the merged branch: hairline 401 against 430.8. By the standing ruling that `/queries` follows the Contact list's header, `QcOpenHeader` takes the same 30px.

| | `/agents` v15.3 | `/queries` before | `/queries` now |
|---|---|---|---|
| **1512** header top | 64 | 64 | 64 |
| hairline y | 430.8 | 401 | 431 |
| desk top | 502.8 | 473 | 503 |
| **1280** hairline y | 357.7 | 328 | 358 |
| desk top | 417.7 | 388 | 418 |

The header is 367px tall at 1512 and 294px at 1280 (it was 337 and 264). QC133 H4 is re-pointed: the drawing's top is the padding plus its drop, 60 (54) below the sheet's top, where it was 30 (24). H3 and H7 hold it equal to `/agents`.

The merge had one conflict, in the design-ref manifest; both sides are kept. Contact list v15.3 has its own hero number and faces, so that lift candidate now has a counterpart.

Gates on the merged tip: tsc 0; both builds clean; Vitest 541 files, 8473 passed, 3 skipped. e2e: QC133 H1–H7, QC134 (all ten) and `qcV131` QC1, 19 passed.
