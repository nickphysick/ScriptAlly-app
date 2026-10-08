# Query Centre v133 — the open header: report

Branch `qc-v133`, one commit, deployed to dev from the branch. Not merged to `main`.

Reference: `design-refs/query-centre/query-centre-v133.html`, `design-refs/qc-v133/ref-header-1512@2x.png` and `ref-header-1280@2x.png`. All three SHA256s matched the brief, as did `public/images/qc/qc-plate-courier-figure.png`.

## 1. False premises and differences from the brief

1. **The art was already registered.** `QC_PLATE_FIGURE` has been in `qcArt.ts` since the plate header. Nothing was added.
2. **The mock's buttons are not the Contact list's.** The mock draws them 48px tall, 16px type, 12px apart. The brief says to style them exactly as `.cl15-b1` / `.cl15-b2` with a 10px gap, which is 44px and 15.5px. I followed the brief.
3. **"Nothing else on the page changes" needed one number to move.** The desk sat 22px under the band. The Contact list's desk is 28px under its hairline, and H3 holds the two equal, so the desk's top margin is now 28 (`.qc13 .qc131-desk` in `qcv131.css`).
4. **A 266px drawing cannot sit in the Contact list's header row unchanged.** That header's hawk is 266px with 8px hanging over the hairline, so its row is 258px. For the hairline to land on the same y, this header's row must also be 258. The drawing is 266px with 4px over the top and 4px over the bottom of its row, which keeps it centred on the text (0px apart at both sizes).
5. **The header is the desktop's only.** Below 768px the page is still the v126 page, which draws `PageHeader band card` and the disc. The brief did not mention the phone; I left it alone.
6. **"The title holds its shape" is true to within a few pixels, not exactly.** The loading title is "00 queries out", painted over. Special Elite's digits are not one width, so the real count can be a few pixels wider or narrower (measured 540.1 → 535.4), and the drawing, which starts after the text, moves by the same. The header's box, the title's height, the line and the buttons do not move. H6 allows 8px on the title's width and the drawing's x.
7. **`livingHeadersV3` LH9 had been hanging since v132.** Its Query Centre branch opened the v126 filter pill, which v132 replaced on the desktop. I missed it then because that suite was not in v132's runs. It is fixed here (§3).

## 2. §0 findings

### 2.1 How the hero was drawn

`QcCentre` rendered `PageHeader variant="full" band card compact` with `living`, `headLine` and `QC_COURIER_DISC`. The living title is `qcHeaderCopy(...).headline`: "{N} queries out", "One query out" or "No queries out". The open header reads the same headline.

`QC_COURIER_DISC` is still used: by the phone's header in `QcCentre`, and by `qcArt.test.ts` and `qcCentre.test.tsx`. The file stays.

### 2.2 The Contact list's header, measured

| | 1512 × 900 | 1280 × 800 |
|---|---|---|
| Top margin | 28 | 24 |
| Header top (y) | 92 | 88 |
| Title size | 72 / 70.56 line | 58 / 56.84 line |
| Hairline (y) | 369.0 | 305.1 |
| Hairline to desk | 28 | 28 |
| Desk top (y) | 397.0 | 333.1 |
| Bottom padding | 18 | 18 |
| Column gap | 56 | 36 |

The Query Centre after the build: header top 92 / 88, hairline 369 / 305, desk top 397 / 333.

## 3. Locks retired and re-pointed

Full reasons are in `tests/e2e/RETIRED-query-centre-v133.md`.

- **Retired:** `qcV131` QC2 (the 178px hero card, stacked pills, 150px disc).
- **Re-pointed, claims intact:**
  - `qcV131` QC1: the hero is the open header, and the desk is 28 under its hairline.
  - `pageHeaderV2` §2 at 1280, 1440 and 1920: `/queries` draws its own open header and no shared one.
  - `quietBar` Q8: the open-drawing floor counts own-header routes.
  - `livingHeadersV3`: the Query Centre left the page list, as the Contact list did in v15. LH1, LH2, LH4, LH6, LH7 and LH10 run over three pages.
  - `livingHeadersV3` LH9: the stale Query Centre branch is removed.
- **Register:** `/queries` moved from `BAND_ROUTES` and `COMPACT_ROUTES` to `OWN_HEADER_ROUTES`.
- **Coverage lost:** `QcEmpty` still draws the shared living header, and `livingHeadersV3`'s empty-page cases no longer visit it. The remaining rendered check of the empty state is `qcV131` QC15, which is red for want of its reference capture.

**Red before this pass, checked against a build of `main` at `0e9c98ef`, and not touched:**

| Case | Reading on the baseline |
|---|---|
| `inkShell` INK19 | "the phone's shell against main's" |
| `plateHeader` PH1–PH4 at 1280 and 1440 | "measured fewer checks than they claim" |
| `plateHeader` PH5 | "no PH5 reference" |
| `pageHeaderV2` §4.5 the switcher | click on `.ws-ms-add` times out |
| `qcV126` QC126-2 | reads `a17.css` |
| `qcV131` QC15 | reference capture absent |

## 4. Each lock, red and green

All six pass at 1512 × 900 and 1280 × 800. Red readings are in `mutation-proofs.json`.

| Lock | Mutation | Red reading | Green |
|---|---|---|---|
| H1 open | restore `band card` | the open header is not found | no ground or radius on any ancestor; Special Elite 72 / 58; exact line |
| H2 centred | drop the drawing's left margin | "the drawing starts 56 after the text" | centres 0px apart; 266 / 206 tall; 112 / 72 after the text |
| H3 rhythm | bottom padding 28 | "hairline 379 / 369" | top 92 / 92, hairline 369 / 369, desk 397 / 397 (1512); 88, 305, 333 (1280) |
| H4 headroom | remove the top margin | drawing's top 60 against the bar's bottom 64 | 24px and 20px clear; no sideways overflow |
| H5 buttons | swap the handlers | Log opens "resp" | "log" and "resp"; both disabled while loading |
| H6 no jump | shorten the loading title | "title width 233.8 → 535.4" | header box identical loading and loaded |

H1's red is the lock failing to find its subject, which is a failure by the standing rule; it does not reach the ground-and-radius check.

## 5. Lift candidate

`QcOpenHeader` + `qcvOpenHeader.css` and `ContactOpenHeader` + `.cl15-hd` are the same header built twice. They differ in the drawing (its size, its extra left margin, its mask) and the copy. Lift both into one `shell/` component with v132's duplicates.

## 6. Gates

| | Baseline (`0e9c98ef`) | Branch |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| Production build | clean | clean |
| Dev build | clean | clean |
| Vitest | 538 files, 8,445 passed, 3 skipped | 539 files, 8,449 passed, 3 skipped |

e2e: QC133 6 of 6. A run of every suite that reads the header (`qcV133`, `qcV132`, `qcV131`, `qcV1311`, `qcV126`, `qcV96`, `quietBar`, `pageHeaderV2`, `livingHeadersV3`, `inkShell`, `plateHeader`, `contactV15`) gave 97 passed, 31 skipped and 17 failed before the re-points. After them, the re-pointed cases pass (16 passed, 1 skipped), and the remaining reds are the six rows in §3's table. I re-ran the changed cases, not the whole set.

## 7. Shots

`reports/qc-v133/shots/`: `queries-1512.png`, `queries-1280.png`, and the same crop of the Contact list, `agents-1512.png`, `agents-1280.png`. They sit beside `design-refs/qc-v133/ref-header-1512@2x.png` and `ref-header-1280@2x.png`. The reference's typewriter text falls back to a monospace, as v132's did.
