# Query Centre v137 — the Analytics layout, the list as the page, pinned controls, and a lip under the tab

Branch `qc-v137`, one commit per part (A to E) and a follow-up commit for the locks, the retirements and this
report. Not merged to `main`.

## False premises, and where the build differs from the brief

1. **The list is 1208 wide at 1512, not 1216.** The brief asks for 24px from the sheet's edges and 1216 wide.
   The reference's sidebar is 240 wide; the app's is 248, so the sheet is 1256 and the list is 1208. I held
   the 24px. C2 asserts "the sheet less 48".
2. **"What you sent" is hidden below 900px of list, not 1100.** The brief says 1100. Its own 1280 reference
   draws the column, and at a 1280 window the list is 976 wide. Below 1100 the list keeps the narrow layout it
   already had (the package slot as its 34px mark); below 900 the column and its heading go. So it is hidden
   at 1180 and 1024, and drawn at 1280.
3. **No scroller has top padding to take 12px from.** The brief says the lip takes its 12px from the sheet's
   existing top padding. No page-sheet scroller has any; each page has its own top air inside. The lip is
   12px tall with a -12px bottom margin, laid over that air, so nothing moves.
4. **There are two page-sheet scrollers, not one.** Workspace pages scroll in the workspace grid; the
   dashboard, the Help centre and Plans scroll in the shell's own body. The lip is mounted in both.
   **Account settings scrolls in a third element of its own and has no lip.**
5. **There is no "Due this week" chip.** The reference draws one. The app's chips are Your move, Overdue,
   Offers, Closed, Stage and More filters, and the brief says not to touch them.
6. **"Recently updated" is already a sort.** It is "latest activity first", and it is the default. Nothing
   was added.
7. **Cell 1 is 72 where the account has 73 rows.** It is the three cells added up, as B1 asks. Withdrawn and
   signed queries sit in none of the three.
8. **The subline names no manuscript on the harness account.** It names one when the page is scoped to one
   book. The account has several and opens on all of them.
9. **The court filter is the old Recently-updated chooser, re-used.** Pressing a v136 card scoped "Recently
   updated". That state now narrows the list.
10. **Pinning cannot jitter by construction, so D3's mutation is not "remove the hysteresis".** Pinned is read
    from a sentinel above the header, which the header's height cannot move. Removing the hysteresis alone
    leaves D3 green. The mutation that reddens it makes the pinned list grow above the header with scroll
    anchoring back on.
11. **An empty current week is a rust tick.** The brief says empty weeks are a 1px tick and this week is rust.
    The harness account has sent nothing this week; I made the last mark rust either way.
12. **At 1024 the Find field takes its own line.** Beside the three controls it was squeezed to nothing.
13. **The lip is desktop only.** Under 768px the phone shell has no folder tab.

Base: dev/header-v3-landing-v2-feed-drawer-v2 @ 383c88d4. Reaching main needs header-panel-v2, header-v3, qc-v136, landing-colours-v2 and feed-drawer-v2 merged first, in that order.

## Deploy: not done, and why

The brief says to deploy `qc-v137` itself, on the understanding that nothing would drop off dev. That is no
longer true. Dev serves `index-v7i_Tl5S.js`. I built
`origin/dev/header-v3-landing-v2-feed-drawer-v2-onb-v5-import-fixes-import-page-truth` at `aa0ba516` and got
the same hash, so that is what dev is serving. It holds onboarding v5 and the import work on top of this
pack's base. Deploying `qc-v137` alone would remove them.

`qc-v137` is pushed. See the end of this report for the two ways forward.

## §0 findings

- The base has header v3's shared panel with a title variant; Part A uses it.
- `/queries` mounted, top to bottom: the panel (`QcOpenHeader`), the v136 bands (`QcGlance`), the full-list
  link, "Recently updated" (`QcRecent`), the banner, the list header (`QcWorkspaceHead`, with the hawk) and
  the list (`QcList132`). The phone (under 768px) keeps the v126 page and is untouched.
- The list's filter is one value; the chips set it. The court is a second, separate narrowing.
- The folder tab's colour is `--ink-tab`: the page's colour, or the header sheet's where a route has one.
- Baseline on 383c88d4: tsc clean, both builds clean, Vitest 541 files passed and 1 failed to load
  (`functions/src/email.test.ts`, unchanged), 8,366 passed, 3 skipped. I started Part A before my baseline
  run in the new worktree had finished, so that figure is from the same commit measured the day before.

## Gates after the pack

tsc clean. Production build and dev build clean (the chunk-size note only). Vitest 543 files passed and 1 failed to
load (the same `functions/src/email.test.ts`), 8,379 passed, 3 skipped.

## Locks: `tests/e2e/qcV137.measure.ts`

All eleven are green at 1512 × 900 and 1280 × 800 (C2 also at 1920 × 1080; C3 at 1024 × 768 and 1180 × 800).
Each went red under its named mutation (`reports/qc-v137/mutation-proofs.json`, logs in `mutation-runs/`).

| Lock | Green reading | Mutation | Red reading |
| --- | --- | --- | --- |
| A1 header | `rgb(45, 58, 80)`, radius 14, title 50 on two lines, no number, drawing 196 | a number element back in the panel | 1 number element |
| B1 strip | 72 = 13 + 46 + 13, four equal cells, 20 bars, the last rust | cell 1 one higher | 73 vs 13 + 46 + 13 |
| B2 filter | each cell: pressed, "Showing n" equals its figure, scrollTop unchanged; court and chip combine; Clear all clears both | pressing a cell scrolls to the list | scrollTop 0 → 622 |
| C1 removed | 0 of each removed part; list 40.0 under the strip; title row 22 28 18 28 | the v134 gap back | 130.0 |
| C2 width | 24.0 and 24.0 from the sheet's edges; 1600 and centred at 1920 | the list back on the column | 28.4 and 28.4; 1199 wide |
| C3 narrow | no sideways scroll, every cell inside the list, "What you sent" hidden | fixed 284px columns, the column kept | heading shown, 12 cells shown, names 0 wide |
| D1 pins | header 12.0 under the top, chips and headings flush under it, title 24, Summary 34 tall | the header in the flow | header at -765.5 |
| D2 releases | the header rides up with the list's end and is gone with it; Summary returns to the top and focuses the heading | the header fixed to the window | header 12.0–120.0 with the list ended at 67.7 |
| D3 no jitter | 2 changes over 122 steps, worst drift 0 | the pinned list grows above the header, anchoring on | drift 15.0 |
| E1 lip | sticky, 12 tall, the tab's colour, first child, nothing moved on three routes; shadow once scrolled | the lip in the flow | first content 24.0 (was 0.0) |
| L1 no jump | panel, heading, strip and four cells are the same boxes loading and loaded | the loading cells drop their foot | strip 153.8 → 223.8 tall |

E1's "nothing moved" is read against a capture of the base build (`tests/e2e/fixtures/qc137Base.json`).
The dashboard does not scroll at 900 or 800 tall, so its scrolled shadow is not exercised there; `/queries`
and `/agents` exercise it. D2 adds a spacer under the list, in the test only, to have room to scroll the
list's end to the top.

Unit locks: `src/lib/qcStrip.test.ts` (the bars, the two windows, the lines' words),
`src/components/queries/centre/qcPinned.test.ts` (the hysteresis), `qcOpenHeader.test.tsx` (the header).

## Locks retired or re-pointed

Listed in `tests/e2e/RETIRED-query-centre-v137.md`.

- **Retired:** v136 B1–B7 and C1–C2 (A1–A5 were already retired). v134 B1, B2, B3. v132 R1, R2, R3, R5, W1 and
  W10. Header v3 H9 and H10. App shell v2 B3 (the hawk clear of the banner).
- **Re-pointed:** Header v3 moves `/queries` to its title pages, so H2, H3 and H7 no longer read it. v132 W2
  reads the desk's numbers from the strip. v132 W5 keeps the grid and leaves pinning to D1. v132's opener no
  longer waits for "Recently updated". App shell v2's band and banner census drops `/queries`.

Older suites, re-run after the pack:

| Suite | Result |
| --- | --- |
| `qcV137.measure.ts` | 12 passed |
| `qcV136.measure.ts` | 14 skipped (all retired), setup passed |
| `qcV134.measure.ts` | 10 skipped, setup passed |
| `qcV133.measure.ts` | 2 passed, 6 skipped |
| `qcV132.measure.ts` | W2, W3, W5, W7, W8, W9 and W12 pass after the re-points; R1–R5, W1 and W10 are skipped. First run: six W locks failed, all traced to this pack (the base build passes them) |
| `headerV3.measure.ts` | H1–H7, H8 and H11 pass; H9 H10 skipped |
| `headerPanelV2.measure.ts` | 14 passed |
| `shellV2.measure.ts` | B1, B2 and L1 pass after the re-points; S6 failed once in the full run and passed alone (the base build passes it) |
| `feedDrawerV2.measure.ts` | 3 passed, **1 failed: B6**. It fails the same way on the base build. Its baseline is a dated capture of the feed's last 30 days ("119 things you did" then, 123 now), so it has aged out. Not from this pack |

Not re-run: `qcV131`, `qcV1311`, `qcV135`, `inkShell`, `analyticsV17` and the Contact list and Manuscripts suites.
Any of them that reads "Recently updated", the banner, the hawk or the v136 bands on `/queries` needs the same
re-point.

## One regression the older locks found, fixed

At a 1280 window the list is 976 wide where it was 982, and "Revise & resubmit" with its stamp wrapped by 3px
(v132 W12). The rows and their labels give 6px back under 1100px of list.

Also added after v132 W7 failed: a row brought into view by the keyboard now lands below the pinned controls,
not under them (the scroller's scroll padding is set from their measured height).

## Shots

`reports/qc-v137/shots/`, each beside its reference in `design-refs/qc-v137/`:

| Shot | Reference |
| --- | --- |
| `top-1512.png`, `top-1280.png` | `ref-top-1512@2x.png`, `ref-top-1280@2x.png` |
| `pinned-1512.png`, `pinned-1280.png` | `ref-pinned-1512@2x.png`, `ref-pinned-1280@2x.png` |
| `filtered-1512.png` (With you chosen) | `ref-filtered-1512@2x.png` |
| `top-1920.png`, `top-1024.png`, `list-1024.png` | none |
| `lip-agents.png`, `lip-dashboard.png` | none |

## For Nick

- **Deploy.** Either I merge `qc-v137` into the branch dev serves as a new `…-truth-qc137` branch, run the
  gates and the rendered locks there and deploy that; or you tell me to deploy `qc-v137` alone and accept
  that onboarding v5 and the import work leave dev until someone redeploys them.
- **"What you sent" at 1280.** I kept it, as the reference draws it. Say if you want the brief's 1100 rule
  instead; it is one number.
- **Account settings has no lip.** It scrolls in its own element. Adding it there is a small change in a file
  this pack did not otherwise touch.
- **Kept but no longer drawn:** `QcRecent`, `QcGlance`, the banner's copy, the full-list link's handler and
  the hawk. Their CSS is still in the bundle.
