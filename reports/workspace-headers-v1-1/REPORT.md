# Workspace headers v1.1: every navy header sits the same distance from the top of the sheet

Branch `workspace-headers-v1-1`, cut from the line dev served (`index-B4FacP2i.js`,
`dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align-pk43-wsh1` at 22fdb1710). Not merged to main.

## False premises

1. **"Submission packages v43 sits higher too."** It doesn't. Its header is 38 below the sheet's top, the same as
   the Query Centre's, at both sizes. Its wrapper is a real box (`.qc151.qc153.pk43-hdw`), so it keeps the Query
   Centre's 30px of top padding. It needed no change. Its header and bar are now in `before.json`, so H2 covers it.
2. **"Their top corners are under the sheet's lip."** They weren't. On the emulator at 1440 and 1717 the seven
   headers sat 8px below the sheet's top. The page colour reads outside every top corner's curve and the navy inside
   it, so all corners were visible, just pressed against the top. See `shots/strip-before-1440.png`.
3. **"To-do was already right."** It wasn't. To-do's header sat at 8, 30 higher than the Query Centre's, exactly
   like the seven. It's included in the fix (the prompt's own rule).
4. **T2's prescribed break (−12px top margin) can't redden most pages.** Taking 12 off a 38 gap leaves the corners
   in plain view, so only Manuscripts went red. There's now a second break, **T2b**, which lifts the header 50px with
   a transform. It reddens all eleven pages it breaks. It's a transform, not a margin, because on the `.wsnh` pages
   a negative margin collapses into the page's first box and stops flush at the top (gap 0, not above it).
5. **T2's pixel test alone can't see a header lifted off the sheet.** Above the sheet, the pixel outside the curve
   and the "page beside the header" pixel are both shell, so they match. T2 now also requires the header's top to
   be on the sheet.

## Step 0: at rest, scrolled to the top (emulator, e2e user)

The sheet is the page's scroller, `div.wpg-scroll` (Query letters: `div.ws-wbody`). Its top is at 105.8 on every
page. Corners were read by pixel: the page colour outside each top curve, navy inside it.

| page | gap @1440 | gap @1717 | vs Query Centre | corners visible |
|---|---|---|---|---|
| Query Centre (oracle) | 38 | 38 | 0 | all four |
| Contact list | 38 | 38 | 0 | yes |
| To-do | **8** | **8** | **−30** | yes |
| Query letters | 38 | 38 | 0 | yes |
| Submission packages | 38 | 38 | 0 | yes |
| Responses | **8** | **8** | **−30** | yes |
| Analytics | **8** | **8** | **−30** | yes |
| Discover | **8** | **8** | **−30** | yes |
| Comparable titles | **8** | **8** | **−30** | yes |
| Versions | **8** | **8** | **−30** | yes |
| Manuscripts | **8** | **8** | **−30** | yes |
| Corkboard | **8** | **8** | **−30** | yes |

The full readings, including each header's ancestor chain with every top padding and margin, are in `step0.json`.

## The rule

The Query Centre's distance is **`qcv151.css:17` — `.qc151 { … padding-top: 30px; }`** on the page root, plus the
header's own 8px top margin: 30 + 8 = 38. The Contact list restates the 30 on its own root
(`contactQcLayout.css:23`, `.clv-group.cl27[data-v27] { padding-top: 30px }`). Query letters and Submission packages
wrap their header in a real `.qc151.qc153` box, so they inherit it.

- **The seven:** their wrapper `.qc151.qc153.wsnh` *does* carry the 30px, but `wsnh.css` §1 makes it
  `display: contents`, so it has no box and draws no padding. The header sat on its own 8px.
- **To-do:** `todoWs56.css:19` sets `.tws .qc151.tws56-hdw { padding-top: 0 }`. To-do v56 "put back" the root
  padding along with the container, so its header also sat on its own 8.

## The fix (one commit)

- `shell/wsnh.css` §1, once for all seven:
  `.qc151.qc153.wsnh > .qc1531-hd.wsnh-hd.wsnh-hd { margin-top: calc(30px + 8px); }`. The header takes the wrapper's
  lost 30 as margin above its own 8.
- `todo/ws/todoWs56.css`, To-do's own wrapper: `.tws .qc151.tws56-hdw.tws56-hdw { padding-top: 30px; }`.
- Both rules carry `--wsh11: 1`, which is what T1's break switches off.
- Nothing else about any header changed. H1–H4 and H6–H9 hold, as does P2 on everything but To-do's top.
- Not touched: `qcv*.css`, `OpenHeader.tsx`, `SlimBar.tsx`, the Query Centre.

## Locks (`tests/e2e/wsHeaders.measure.ts`, block T, at 1440 × 900 and 1717 × 1000)

| lock | red first (the served line) | green (after) | red under its break |
|---|---|---|---|
| T1 gap = the Query Centre's ±1, all twelve | 8 pages at 8 vs 38 (Step 0) | all twelve 38, both sizes | `WSH_MUTATE=T1`: 8 pages back at 8 |
| T2 both top corners visible, on the sheet | not red; they were visible (false premise 2) | all twelve | T2 (−12): Manuscripts only · **T2b** (lift 50): all eleven broken pages |
| T3 the Query Centre's header and bar pixel-identical | oracle shots taken on the served line | identical, both sizes | n/a (an oracle) |

- **T1's red-first** is the Step 0 reading itself. The recon ran the same code on the served line and recorded the
  diff (−30) instead of asserting it.
- **T4: workspace-headers-v1's locks** (full run after the fix): H1–H7 and H9 green on all seven pages, plus H2 on
  the five built pages, now including packages. The four known reds are unchanged and none is about the header's
  top: Analytics H1 at 1440 (height 250.6, the headline wraps), and H8's three overflow and long-title reds on
  Comparable titles, Versions and Manuscripts.
- **T4: Submission packages v43's P1–P11:** green after two re-points.
  - **P2:** its `before.json` had To-do's header top at 113.8. That's now 143.8, the Query Centre's own, and the
    whole point of this pass. No other To-do field moved (diffed).
  - **P5:** it was already red on the served line before this pass. Its break removed `, .pk43)` from qcv156 §3's
    lists, but workspace-headers-v1 made those lists end `, .pk43, .wsnh)`, so the break matched nothing ("its
    break changed nothing"). It now matches `.pk43` before a `,` or `)`, and goes red again under its break.
- **The collapsed bar:** still shows at the same scroll point. H5 (the bar at 600) and P5 (the bar shown only at its
  place, at 200/260/320) are green.

## The twelve tops at 1440

The strips are, top to bottom: Query Centre, Contact list, To-do, Query letters, Submission packages, Responses,
Analytics, Discover, Comparable titles, Versions, Manuscripts, Corkboard. Magenta lines separate them.

- After: `shots/strip-after-1440.png`
- Before: `shots/strip-before-1440.png`
- Each page on its own: `shots/{before,after}/top-<page>.png`

## Gates

Baseline and final are the same:
- tsc: 0 errors.
- build:dev: clean.
- Vitest: 12,567 passed, 3 failed, 4 skipped.

The three failures are the pre-existing guard scanners (`emuGuard.test.ts`, and two in `firestoreTarget.test.ts`),
red at baseline too. The touched unit specs (shell, todo/ws, qcv156: 554 tests) are green.

## Deploy

DEPLOY_PLACEHOLDER
