# Retired and re-pointed by Query Centre v133 (the open header)

On the desktop the Query Centre's band, its card and its courier disc are replaced by a page-local open
header (`QcOpenHeader`). `/queries` moved from `BAND_ROUTES` and `COMPACT_ROUTES` to `OWN_HEADER_ROUTES`
in `tests/e2e/plateRoutes.ts`.

## Retired (`retiredV133`)

| Case | What it asserted | Superseded by |
|---|---|---|
| `qcV131` QC2 | the 178px hero card, its stacked 40px pills, the 150px disc | QC133 H1, H2 |

## Re-pointed, claims intact

- `qcV131` QC1: the hero is `[data-qcv="open-header"]`, and the desk is 28 under its hairline (was 22 under the band). The 44 and 96 gaps below are unchanged.
- `pageHeaderV2` §2 (1280, 1440, 1920): `/queries` is an own-header route. The case asserts the page draws its own open header and no shared one; its geometry is QC133's.
- `quietBar` Q8: the population floor for open drawings counts the own-header routes. The register drives the exemption, as before.
- `livingHeadersV3`: the Query Centre left the suite's page list, as the Contact list did in v15. Its populated header has no living sentence to measure. LH1, LH2, LH4, LH6, LH7 and LH10 now run over three pages.
- `livingHeadersV3` LH9: the Query Centre's branch is removed. It opened the v126 filter pill (`pk-filter`), which v132 replaced on the desktop, so it had been hanging since v132. A filtered-to-nothing list is QC132 W9's dead end.

## What the suite no longer covers

`QcEmpty` still draws the shared living header with `hero-courier-map.png`. With the Query Centre out of `livingHeadersV3`'s page list, that suite's empty-page cases (LH7, LH8) no longer visit it. `qcV131` QC15 is the remaining rendered check of the empty state, and it has been red since before v132 for want of its reference capture.

## Red before this pass, not touched

- `qcV126` QC126-2 (reads `a17.css`).
- `qcV131` QC15 (reference capture absent).
- `inkShell` INK19 (the phone's shell against main's): red on the build before v133.
- `plateHeader` PH1–PH4 and PH5, and `pageHeaderV2` §4.5: see the report.

## v133.1 (9 Oct) — the Contact list v15.1 design

- QC133 H2 rewritten: the drawing's right edge is the desk's (±2), 326 / 253 tall, the text centred on its layout box. The "112 after the text" claim is retired with the left margin.
- QC133 H4 rewritten: the drawing's top is 30 ±3 (24 ±3) below the sheet's top.
- QC133 H7 added: the drawing crosses the hairline as the hawk does on `/agents`.
- `qcV131` QC1: the desk is 72 (60 below 1440) under the hairline.
