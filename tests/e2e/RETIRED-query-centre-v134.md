# Retired and re-pointed by Query Centre v134

The hero number and faces, the icon desk cards, the tinted band and the banner.

## Retired (`retiredV134`)

| Case | What it asserted | Superseded by |
|---|---|---|
| `qcV1311` D1 | three `#fffdf9` cards 18px apart, no shared frame | QC134 K1 (white cards, 24 / 16 apart, a disc above each, no surface on the grid) |
| `qcV1311` D4 | the rubber stamp: the change against four weeks ago, rotated | QC134 K2, and `qcCourtHistory.test.ts` (`monthChange`) |
| `qcV1311` D5 | the 52px trend, ten points, the last is the big number, its month … Now axis | QC134 K3 |

## Re-pointed, claims intact

- `qcV1311` D2: the copy and its singulars are unchanged; the court's title row is retired, so the case reads the card's line ("13with you" as text content) in its place.
- `qcV131` opener: the desktop desk is `[data-qcv="courts"][data-v]` (was `data-v^="131"`).
- `qcV131` QC1: "Recently updated" starts 64 (52) under the desk, on its band; the banner now stands between it and "Your queries". The old 44 and 96 gaps are QC134 B1's and B2's.
- QC133 H1: the title's face, `data-page-title` and the subheader stay; its size and one-line claim move to QC134 N1.
- QC133 H6: the loading title's width tolerance is 16 (the placeholder is "00" at 124px).

`qcV1311` D3 (the tiles) and D8 (the placeholder cards' box) pass unchanged. v132's R1 passes unchanged: the section's internal geometry did not move, and B1 asserts it again inside the band.

## Deleted with the ledger card

`stampText`, `courtChange`, `trendTip`, `trendLabel`, `TREND_UNIT`, `DeskSection.stamp`, and the `.qc131-hd`, `.qc131-name`, `.qc131-stamp`, `.qc131-body`, `.qc131-n`, `.qc131-chart`, `.qc131-plot`, `.qc131-hits`, `.qc131-ax` and `.qc13-tip` rules. Nothing else read any of them.

## Red before this pass, not touched

- `qcV126` QC126-2 (reads `a17.css`).
- `qcV131` QC15 (reference capture absent).
- `qcV96` QC13 (the page guide sits over the desk at 860px of window height): red on `main` at `036289e7`, since v133.1 moved the desk down. Its failure also fails that file's closing "the run measured what it claims" case.
