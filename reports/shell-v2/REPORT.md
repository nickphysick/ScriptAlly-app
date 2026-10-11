# App shell v2 — oat page, the header sheet and its flap, paper-white bands, flap-edged banners

Branch `shell-v2` (worktree `../ScriptAlly-shellv2`), from `origin/main` at `55eff29a`. Not merged.
References: `design-refs/shell/shell-v2-page.html`, `shell-v2-in-shell.html`, and six PNGs in `design-refs/shell-v2/`. All eight SHA256s matched the pack before enrolment.

Baseline before any edit: `tsc` 0, functions `tsc` 0, `vite build` clean, `build:dev` clean, Vitest 542 files / 8,489 passed / 3 skipped.
At the end: `tsc` 0, both builds clean, Vitest 543 files / 8,498 passed / 3 skipped.

## 1. False premises and decisions that need a ruling

1. **"Every route with a page header uses it" does not hold for Analytics.** Its header is the anthracite band (`PageHeader band bandFixed`), a full-width ink field of its own. The sheet, mounted behind it, hid the band completely (measured: the header read as pale text on paper). Analytics therefore has **no sheet and an oat tab**, and is listed in `headerSheetRoutes.ts`. Nick to rule: leave it, or give the band a flap of its own.
2. **A 26px flap does not fit under the shared `PageHeader` without moving content.** Its pages start their content 24px (full) or 17px (compact) under the header, and the Help centre's search field closer still: the point lay over the first thing on the page (the search field was half covered). `PageHeader` now reserves the flap's depth beneath itself (a transparent 26px bottom border), so **content on the nine `PageHeader` routes sits 25px lower** (26 of room, less the 1px rule). This contradicts "every page's layout is unchanged". It is one rule in `headerSheet.css`; removing it restores the old positions and the overlap. The three open headers reserve nothing: 72 (60) of page already follows them.
3. **S4's wording ("computed `border-bottom-width` is 0") is not met on `PageHeader` routes**, because of item 2: the width is 26 and the colour is transparent. S4 asserts "no border paints (width 0 or transparent)", plus no rule element within 4px. No hairline is drawn anywhere.
4. **"The flying hawk must still clear the banner by ≥ 8" was already true of the old gap at 1512.** Only 1280 binds: with the old 92 the hawk's top is 1.5px inside the flap's triangle. B3's mutation is red at 1280 only.
5. **The pack's stop condition "a route renders two different page headers" is met in the letter by `/queries`, `/agents` and `/manuscripts`**, which render an open header when populated and a different one when empty or on the phone. I read the condition as "two at once" and carried on. The empty states use the sheet (below).
6. **The workspace grid's chrome slab has a hairline of its own** (`.wpg-chrome`, 1px under the masthead on Calendar, Noteboard and Discover). The pack did not list it. With a sheet inside it, it ruled across the flap's point, so it no longer paints there.
7. **Manuscripts' doors are not white.** They are `#fdfcfa` on a band that is now `#fbf9f5`: two levels apart. Each has a 1px ring at 8%, so B1 passes, but the doors barely separate from the band. Nick to rule whether they go to `#ffffff`.
8. **Phone.** The sheet, the flap and the hairline's retirement are desktop only (768px up), like the ink shell whose tab they join. Below 768px headers keep their hairline. Oat, paper-white bands and flap-edged banners apply at every width.
9. **The tab stays paper white when the page is scrolled**, when the header sheet has scrolled away and oat is under the tab. The reference does not scroll, so it does not say. Left as built.

## 2. §0 census

Page colour: `--ws-page-rgb` is declared in `index.css` and redeclared at the same value in `workspaceShell.css` (`.dash-mode / .ground-mode .ws-main`). Both are oat. The footer (`appFooter.css`) reads `var(--ws-page)` and turned oat with no edit. The tab is drawn by `FolderTab.tsx`; its colour came from `--ink-sheet` on `.ws-main` and now comes from `--ink-tab`.

| Route | Header | Hairline before | Sheet | Tab | Band | Banner |
|---|---|---|---|---|---|---|
| `/dashboard` | none (the greeting is content) | none | no | oat | no | no |
| `/queries` | open header `QcOpenHeader` | 1px at 14% | yes | paper | "Recently updated" | yes |
| `/queries/analytics` | `PageHeader band bandFixed` | none | **no (ruling 1)** | oat | no | no |
| `/todo` | `PageHeader full`, living | 1px at 16% | yes | paper | no | no |
| `/todo/calendar` | `PageHeader workspace` (compact) | 1px at 16%, plus the chrome slab's | yes | paper | no | no |
| `/todo/noteboard` | `PageHeader workspace` (compact) | as Calendar | yes | paper | no | no |
| `/agents` | open header `ContactOpenHeader` | 1px at 14% | yes | paper | next step | yes |
| `/agents/discover` | `PageHeader workspace` (compact) | as Calendar | yes | paper | no | no |
| `/manuscripts` | open header `Msv21Parts` | 1px at 14% | yes | paper | "Your materials" | yes |
| `/manuscripts/comps` | `PageHeader full`, living | 1px at 16% | yes | paper | no | no |
| `/manuscripts/packages` | `PageHeader full`, living, with art | 1px at 16% | yes | paper | no | no |
| `/import` | `PageHeader workspace` (compact) | 1px at 16% | yes | paper | no | no |
| `/plans` | `PageHeader workspace` (compact) | 1px at 16% | yes | paper | no | no |
| `/help` | `PageHeader workspace` (compact) | 1px at 16% | yes | paper | no | no |
| `/account/…` | none (the settings chassis titles each section) | none | no | oat | no | no |

Empty states that keep their own headers, all through `PageHeader` and so all with the sheet: `QcEmpty` (`card`), `ContactEmpty` (`living`, empty), and the phone Query Centre is a band and has none. **None of the empty states was rendered in this pack**: the harness account is populated. The card header takes the sheet but not the reserved room, because it paints its own background.

Pages that override the page colour (§0.5), **left alone**:
- `todoSplit.css` `.tdw-rail` redeclares `--ws-page-rgb: 255, 255, 255` for the inside of the To-do desk's white card. It is not a page ground.
- Auth's `--ground` and the marketing tier are outside the signed-in shell.
- The dashboard reads the shared token and is oat.

## 3. Literals replaced

| File | Was | Now |
|---|---|---|
| `index.css` | `--ws-page-rgb: 243, 242, 240` | `242, 238, 232`; plus `--ws-sheet` and `--ws-band`, `#fbf9f5` |
| `workspaceShell.css` | `243, 242, 240` in the route redeclaration | `242, 238, 232` |
| `msv21.css` | three fills of `#f3f2f0` (ghost, dialog input, segmented control) | `var(--ws-page)` |
| `pageGuide.css` | the guide button, `#f3f2f0` | `var(--ws-page)` |
| `qcvBand134.css`, `msv21.css` | band `#e9e6e0` | `var(--ws-band)` |
| `contactV14.css` | `--cl15-band: #e9e6e0` | `var(--ws-band)` |
| `qcvOpenHeader.css`, `contactV15.css` | face halo `var(--ws-page)` | `var(--ws-sheet)` |

The desk discs' 5px halo (`shell/desk/desk.css`, `qcv131.css`) already read `var(--ws-page)` and turned oat with no edit.

## 4. What was built

- `shell/HeaderSheet.tsx` + `headerSheet.css`: one element behind a header. The outer element is the page sheet's width (the shell's published `--ink-sheet-l/-r`), centred on the header, and carries the drop shadow as a filter; the inner one is clipped to the flap. `--hsheet-flap`, `--hsheet-w` and `--hsheet-clip` are stated once and the banners read them.
- `shell/headerSheetRoutes.ts`: the one register of routes without a sheet. The shell reads it for the tab and the locks read it for the census.
- A fault the locks caught during the build: a wider under-layer added to survive classic scrollbars gave **every scroller a viewport's width of sideways scroll**. It is a spread shadow now, not a wider box.

## 5. Locks

`tests/e2e/shellV2.measure.ts` with `sh2Lib.ts`, at 1512 × 900 and 1280 × 800. "Unchanged from main" is compared with `reports/shell-v2/baseline.json`, captured from a build of `origin/main`. Mutations are applied in the page (`SH2_MUTATE`, `tests/e2e/sh2Mutations.sh`).

| Lock | Red on main | Green on the branch | Red by its mutation |
|---|---|---|---|
| S1 oat | 38 of 40: page sheet `rgb(243, 242, 240)` | 40 of 40; no literal left in `src` | 30 of 40 |
| S2 sheet | 96 of 120: no sheet | 144 of 144: `rgb(251, 249, 245)`, edges on the page sheet's, no overflow | 48 of 144: sheet 289–1231 against page 248–1272 |
| S3 flap | 24 of 24: no sheet | 96 of 96: outline at four x's, e.g. 357 / 362 / 383 against 357.7 / 362.2 / 383.0 | 96 of 96: a straight edge reads 357 at the centre |
| S4 no hairline | 30 of 72: `1px` at 0.14 | 72 of 72 | 6 of 72 (the open headers; the shared header's rule outranks the mutation) |
| S5 art | 16 of 31: no sheet | 31 of 31: painted above the sheet, 12–24 over the edge, box as main | 8 of 31: the sheet is hit instead of the drawing |
| S6 tab | 54 of 61: greige | 61 of 61 | 24 of 61: tab oat on a sheet route |
| B1 bands | 12 of 36: `rgb(233, 230, 224)` | 36 of 36; every card ringed | 12 of 36 |
| B2 banner flap | 21 of 42: arrow 150 wide, old gap | 42 of 42: no arrow, 26 at the centre, no shadow, gap + 26 | 18 of 42 |
| B3 hawk | 1 of 6: at 1280 the hawk's top is 341.3 and the flap reaches 342.8 | 6 of 6: clears the flat edge by 48.9 at 1512 | 1 of 6 (1280 only; see premise 4) |
| L1 no jump | 48 of 61: no sheet | 61 of 61 | 8 of 61: sheet absent while loading |

Unit: `src/components/shell/headerSheet.test.ts` (9 cases: the register, the tokens, the tab's token, the readers).

Three things about the locks themselves:
- A first "red on main" run was not red at all: the bundle guard had refused a stale bundle and every case failed in under a second. It was rerun.
- L1 first reported every box 4px out. The pages rise 4px on entry and the first read was mid-rise. Motion is now killed from the first frame and both reads are of one load.
- The shared header grows about 30px while a living line settles, on main too. L1 allows the sheet that much (`hjump` in the baseline) and no more.

## 6. Older locks retired or re-pointed

| Suite | Lock | What changed |
|---|---|---|
| `contactV15` | CL15-1 "the hairline: 1px ink at 14%" | retired; holds its absence |
| `contactV151` | H3 "the hairline is 1px ink at 12–14%" | retired; holds its absence |
| `contactV151` | B1 band colour and painted edges | `233, 230, 224` → `251, 249, 245` |
| `contactV152` | K8 arrow (two readings) | retired; holds that no arrow is drawn. Floor 22 → 20 |
| `contactV152` | K8 banner to bar 76 (64) | 102 (90) |
| `qcV134` | B1 band colour | paper white |
| `qcV134` | B2 arrow (four assertions) | retired; holds that no arrow is drawn |
| `qcV134` | B2 banner to bar 104 (92) | 130 (118) |
| `manuscriptsV21` | V1 arrow | retired; holds that no arrow is drawn |
| `manuscriptsV21` | V1 Versions 76 (64) under the banner | 102 (90) |
| `manuscriptsV21` | M1 band colour | paper white |
| `inkShell` | INK2 "tab, fillet and sheet one colour" | the tab and fillet are the header sheet's colour on a sheet route, the page sheet's elsewhere |
| `inkShell` | INK3 pixels across the tab's foot | expects the header sheet's colour on `/todo`; one level of tolerance at fractional scales (measured `251, 250, 246` against `251, 249, 245`) |
| `livingHeadersV3` | LH7 "no rule on the empty page, one on the populated" | no rule on either |
| `livingHeadersV3` | LH0 header height against the ref | less the flap's room |
| `pageHeaderV2Lib` | "the rule" | the header's flat bottom edge |
| `pageHeaderV2` | §4.2 side panel at the rule + 24 | + the flap's 26 of room |
| `qcV126`, `analyticsV17`, `contactV151`, `contactV152` | page-colour pins | oat |
| `pageHeaderDefault.test.tsx`, `msv21Smoke.test.tsx` | frozen markup; token allow-list | carry the sheet element and the shell tokens |

Red on untouched main as well, and not touched: `compsMat` frame (six cases), `pkgMat` S1–S7, `pageHeaderV1` §2, §3.1 and §3.2, `inkShell` INK19, and `manuscriptsV21`'s floor.

Not run: the rest of `tests/e2e/` (about sixty suites). Any that pins the greige, the old band colour, a header hairline or the 25px under a `PageHeader` will be red.

## 7. Shots

In `reports/shell-v2/shots/`. `compare-*.png` puts the branch beside the reference PNG for the Query Centre's top, band and banner at both widths. `top-<route>-<width>.png` is the top of every route; `band-*` and `banner-*` are the three pages' bands and banners.
