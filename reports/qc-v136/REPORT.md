# Query Centre v136 — report

Branch `qc-v136`, three commits (A, B, C), deployed to dev from the branch. Not merged to `main`.

Reference: `design-refs/query-centre/query-centre-v136.html`, `query-centre-v136-in-shell.html` and four PNGs in `design-refs/qc-v136/`. All six SHA256s matched the brief, as did `public/images/qc/qc-plate-courier-figure.png`.
Locks: `tests/e2e/qcV136.measure.ts` (A1–A5, B1–B7, C1–C2). Proofs: `reports/qc-v136/mutation-proofs.json`.

## 1. False premises

1. **The page is not scoped to "the current manuscript".** The brief says {N} is every query for the current manuscript and the subheader is "for {manuscript title}", with the sidebar switcher as the title's source. The Query Centre has its own scope (`qcScope`, set in "+ More filters"), which starts at every manuscript. The sidebar's manuscript does not scope it. On an account with more than one book, "for *Harbour of Glass*" over a count of every book's queries would be false. **The subheader is drawn only when the page is scoped to one book**: when a manuscript is chosen in the page's own filter, or the account has exactly one manuscript. Otherwise there is no subheader. On the harness account at rest there is none; scoped to *Harbour of Glass* it reads "for *Harbour of Glass*" over 8 queries. This needs a ruling (§7).
2. **{N} cannot be both "every query" and "active + inactive".** A withdrawn or signed query sits in no court, so it is in neither band. On the harness account there are 83 queries and the bands hold 82. The brief bakes N = active + inactive and A2 locks it, so the title counts the bands' own rows: "You've sent 82 queries" beside a list that says 83.
3. **Comparable titles has no ruled-corner header.** On this base `/manuscripts/comps` draws the header-panel-v2 panel. There is no ruled paper or red margin line anywhere in `src/`. The ruled corner is built page-local from Part A's values, so it exists in one place only and there is no lift candidate yet.
4. **`header-panel-v2` already contained `main`.** The branch is cut from `origin/header-panel-v2`; merging `origin/main` was a no-op. No conflicts.
5. **The month-on-month figure is never null.** `deskSections` always states one. The component draws no pill for a null figure and a unit fixture proves it (`qcGlance.test.tsx`); the rendered page cannot show that state.
6. **The brief gives no pill wording for no change.** It reads "No change on last month", with no arrow.
7. **B5's named mutation does nothing on its own.** The row is fitted by measurement, so `flex-wrap: wrap` alone wraps nothing. B5 is proved red with the fit switched off as well.
8. **"Below 768px the header stacks as it does today."** Below 768px the Query Centre renders the v126 page, with its own header and desk; neither `QcOpenHeader` nor the bands are mounted there. Both sheets carry the stacking rules, so each is whole at any width, but no phone reading exists.
9. **The link is a button, not an anchor.** It scrolls and moves focus; it does not navigate and writes no hash. The mock's is an `<a>`.

## 2. Where the mock differs from the brief (the brief's values were built)

| | Mock | Brief, as built |
|---|---|---|
| The rule | a `box-shadow` under the header | a 1px bottom border |
| Rule to bands | 12px margin | 40 |
| Ruled lines and margin line | start 40px above the header; the lines span the viewport | start at the sheet's top; the lines span the sheet |
| Drawing | 268 (226) tall, no margin | 274 (231) with −6 (−5), because the real file has 8px of padding under the figure |
| Stamp | inside the `h1` | after it, outside |
| Month pill's ink | 50% in one rule, 60% in a later one | 60% |

## 3. §0 findings

1. **Base:** `origin/header-panel-v2` at `4448cce5`, which is 15 commits ahead of `origin/main` and 0 behind.
2. **The header as built:** `QcOpenHeader`, with `.hpanel.hpanel--hero` and `data-hpanel`. The living title was `LivingHeader.count` (the manuscript scope's row count) with "queries out". The stamp was `.hpanel-stamp`, "{n} with you", from `deskSections`' With you total, hidden at 0. Faces came from `lib/qcFaces.facesFor`. The buttons call `onLog` (the log drawer) and `onRecord` (the response drawer). The art was `qc-courier-disc.png`; v136 goes back to `qc-plate-courier-figure.png`. Measured: the file's ink stops 1px short of its right edge and 8px short of its bottom.
3. **Ruled-corner header:** not built anywhere (§1.3).
4. **The desk as built:** `QcDesk.tsx` and `qcvDesk135.css`. Counts, lines and the hot rule are `deskSections` in `lib/qcDesk.ts`; month on month is `monthChange` in `lib/qcCourtHistory.ts`; a press calls `pickCourt`, which scopes "Recently updated" only. All of that is unchanged and feeds `QcGlance`.
5. **The list's target:** `[data-qcv="ws-head"]` heads the workspace; its heading is `<h2 class="qcw-title" data-qcv="ws-title">`. It had no id and was not focusable. The link sets `tabindex="-1"` on it when pressed, so the workspace's file is untouched.
6. **The manuscript title:** `qcLineTitle` in `Queries.tsx`, which is the page's own scope's title, or the only manuscript's (§1.1).

**The folder tab** needs nothing: `inkShell.css` paints it the page's colour unless a header sheet is on screen. With no panel and no sheet it is `rgb(242, 238, 232)`, the page's colour (A1).

## 4. Locks retired and re-pointed

Full reasons are in `tests/e2e/RETIRED-query-centre-v136.md`.

- **Retired:** `qcV135` B1–B6, B7, B8, B9 · `qcV134` N1, L1 · `qcV133` H3.
- **Re-pointed:** `headerPanelV2` P1/P4/P5/P7, P6, A1–A6, C1, D1 and its floor · `qcV134` B1 · `qcV131` QC1.
- **Unit:** `qcOpenHeader.test.tsx` rewritten; `qcDesk.test.ts` reads "overdue"; `qcGlance.test.tsx` is new.
- **Censuses:** `/queries` was already in `OWN_HEADER_ROUTES`. `hp2Lib.ts` gains `OPEN_HEADER` and drops `/queries` from its workspace list.
- **Red before this pass, untouched:** `qcV126` QC126-2, `qcV131` QC15, `qcV96` QC13, `pageHeaderV2` §4.5.

`headerPanelV2` D1 used to hold the Contact list's badge cards equal to the Query Centre's. With the Query Centre's desk gone it holds them to the same numbers as constants. That is a weaker lock than an equality between two pages.

## 5. Each lock, red and green

All fourteen pass at 1512 × 900 and 1280 × 800. Both are compact: the page sheet is 1256 and 1024 wide.

| Lock | Mutation | Red reading | Green |
|---|---|---|---|
| A1 open | restore the panel class | "the header carries a panel class" | no ground or radius; no sheet; tab is the page's colour |
| A2 title | hard-code 27 | "82" expected, "27" received | 82 = 69 + 13; scoped: 8 = 6 + 2, "for Harbour of Glass" |
| A3 alignment | drop the art's negative margin | ink ends 4.9px above the rule | ink right 0.6px inside the bands' edge; ink bottom 0.1px off the rule |
| A4 ruled corner | remove the mask | 7 ruled lines past the fade | 7 lines at the sheet's left, 0 at 65–71% of its width |
| A5 rhythm | 80px gap | "rule → bands 80" | 40 |
| B1 groups | swap the colours | active band grey | blush and grey; "69 active", "13 inactive" |
| B2 cards | gap 0 | "the active cards are 0 apart" | 8 apart; all three 180.4 tall |
| B3 card layout | `grid-template-areas: none` | the divider is right of the headlines | number centred on its headlines; pill right-aligned |
| B4 copy | "responses overdue" | "overdue" expected | lines exact; rust on 1 offer and 35 overdue only |
| B5 faces | wrap, with the fit off | row 60 tall against a 30 disc | one row; 8 + 5 of 13, 8 + 48 of 56, 7 + 6 of 13 (1280) |
| B6 select | remove the press handler | `aria-pressed` false | pressed, navy ring, "Recently updated" scoped, list unchanged |
| B7 no jump | hide the faces while loading | band 182.4 → 245.4 | every box equal |
| C1 above the fold | margin-top 300 | link ends 11.6px below the viewport | ends at 641.6 of 900 and of 800 |
| C2 link | remove the focus call | focus stays on the link | heading in view and focused; URL unchanged |

Measured heights: header 227; bands 245.4; cards 180.4; link 35.2. They are the same at both sizes, because both are compact.

## 6. Gates

| | Baseline (`4448cce5`) | Branch |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| Production build | clean | clean |
| Dev build | clean | clean |
| Vitest | 540 files, 8,351 passed, 3 skipped | 541 files, 8,358 passed, 3 skipped |

e2e: QC136 14 of 14. The suites that read the Query Centre's header or desk (`qcV135`, `headerPanelV2`, `shellV2`, `qcV134`, `qcV133`, `qcV132`, `qcV131`, `qcV1311`, `quietBar`, `pageHeaderV2`) gave 43 passed, 46 skipped and 17 failed before the re-points. After them the changed cases pass; what stays red is the four rows listed in §4 as red before this pass. `shellV2` S6 timed out at sign-in on the first run and passed on re-run. I re-ran the changed files, not the whole set a second time.

## 7. For Nick

1. **Should the Query Centre scope itself to the sidebar's manuscript?** That is what "for {manuscript title}" assumes. Today it does not, so the subheader only shows when the page's own filter is on one book (§1.1).
2. **Should {N} include withdrawn and signed queries?** If so, they need a home in a band, or the title and the bands will differ by them (§1.2).
3. **The ruled-corner header exists only here.** If Comparable titles is to share it, that is a separate change.

## 8. Shots

`reports/qc-v136/shots/`:

| Shot | Reference |
|---|---|
| `page-1512.png`, `page-1280.png` | `ref-page-1512@2x.png`, `ref-page-1280@2x.png` |
| `cards-1512.png`, `cards-1280.png` | `ref-cards-1512@2x.png`, `ref-cards-1280@2x.png` |

The shots show no subheader, because the harness account has several manuscripts and the page is unscoped at rest.

## 9. Lift candidates

None new for the ruled corner: it is built once. `QcGlance`'s faces row and `useTip` join the list from v134.
