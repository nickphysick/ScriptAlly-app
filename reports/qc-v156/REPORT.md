# Query Centre v156 — the launch look: report

Branch `query-centre-v156`, pushed, **not merged to main**. On dev through `dev/srm1-plv3-qc156` (`3de6d2079`), which serves **`index-P-Ljb31B.js`** at https://scriptally-dev.web.app (Queries → Query Centre). Prod untouched.

Ref: `design-refs/query-centre-v156.html`, sha256 `5dd77dae…ec0b`, which matched. It came from `~/Downloads/query-centre-v156-pack.zip`; it is committed and on the design-ref watchlist.

## False premises (read first)

1. **The Contact list has no "Views" panel to reuse.** On the dev line, and on every branch I checked, the Contact list's filter column is `ContactRail27`: a "Filter" card with Most used pills, Genres, a "More filters · Where they stand, submissions" row and a foot. Nothing reads "Views", "Refine" or "within this view". So §6's "reuse the Contact list's Views panel component" could not be done as written.
   - What I did instead: `QcViews156` is drawn from the v156 ref over the rail bones both pages already share (`qc153-rail` card and stickiness, `qc153-rbd` head with Reset, `qc153-rft` foot). Its look lives in `qcv156.css`, scoped to `.qc156-views`, so the Contact list's rail is unchanged.
   - ⚠️ The reuse runs the other way. Another session's "Contact list — Query Centre layout v1" brief extends *this* panel and the navy header onto the Contact list. It stopped at its Step 0 on 14 Nov to wait for v156 on dev (memory `cl-qc-layout-v1-waiting`). v156 is now on dev; its served `AppRoot-BIOQODDI.js` carries "within this view". That run should build from `QcViews156` / `QcSlim156` rather than copy them.
2. **The Contact list's collapsed bar is 48px, not 60.** The prompt asks for 60px *and* "build it from the Contact list's so the two pages match". I followed the explicit 60px and the ref's type sizes.
   - What is shared is the behaviour: the reader (when to show) and the offset (`--pin-cover`). Both are extracted from `ContactSlimRow` into `shell/slimReveal.ts` (`useSlimReveal`), unchanged, and both pages call it.
   - The two bars' visuals still differ: 48 vs 60px tall, 19 vs 24px titles.
3. **"It pins on scroll as the rail did": on the harness the rail did not pin.** It was 1330px tall, taller than the scroll area, so v154's tall-rail rule made it `position: relative`. The Views card is 703px and pins.
4. **The header grows about 45px, not about 30.** Today it is 198.2px; it is now 242.9px. The ref is 243 (the prompt's 237 is wrong).
5. **Base.** v155 is on the dev line. I cut from `dev/clh2-nwv1-clh21-ql21-nw11-snv3` (`09901d3b0`), which was what dev served when I started and holds v155's phase commits; the bare `query-centre-v155` tip adds only a report commit. I did not cut from the bare v155 branch because the Contact list slim row I had to share lives on the dev line.
   - By deploy time dev had moved on to `plans-v3` (`index-C1eM6OE5.js`, on shell-rail-menu-v1). So the dev branch is `plans-v3` + this branch.
6. **The "Overdue" view and the Dates box "Past their reply date" are one field** (`past`). This was already true of the rail's Overdue pick and its More switch.
   - Overdue selected shows the Dates box ticked.
   - Selecting another view clears `past`, as the rail's `pickQuick` did.
7. **v155.1 (a sticky Birds-eye header) is not on this base.** In Birds-eye the date row pins under the toolbar as it did before: it sits behind the toolbar strip, as on the before build.

## Step 0 readings (before, 1920 and 1440; `step0-readings.json`)

| | before |
|---|---|
| Header height / bottom margin | 198.2px / 0 (padding-bottom 4) |
| Page tab background / sheet background | `#f2eee8` / `#f2eee8`; the scroll area `#f6f3ee` (the mismatch) |
| Toolbar sticky offset / what it paints at rest | `top: 0` (bar 12px under the lip); a `#f6f3ee` strip with a 22px fade, at rest too, reaching 12px up over the header's foot |
| Filter rail width / sticky offset | 268px / `top: 0` with `position: relative`: too tall to pin (v154 §6) |
| Contact list slim row | 48px, `top: 12px`, shown by 800px of scroll |

- **Weekly counts, goal and streak:** `weekGoal154` (lib/qc154goal), from `queries[].dateSent` and `currentUser.queryingGoals` in Queries.tsx.
- **The filters:** all of them live in one `Qc138Filters` held in Queries.tsx state.
  - The quick filters are the fields `you`, `past`, `waiting` and `offers`.
  - Status is `stages`, and rounds are `sent`.
  - The "More" date filters are `dueWeek`, `past`, `missing` and `overYear`.
  - Quick filters could not be combined: `pickQuick` is a radio.
  - The state is remembered per visit (`readQcVisit`).
- **Export:** yes. `exportQcList` existed, and the rail's foot already called it. The footer link is present: "Export n queries".

## Commits (`query-centre-v156`)

| Phase | Commit |
|---|---|
| Base | `09901d3b0` (dev line …-snv3) |
| 1 · cards and page colour | `c22d61f94` |
| 2 · navy header and the line | `f98e4ceb5` |
| 3 · collapsing header | `ae076b97b` |
| 4 · Views panel | `59a8ff147` |
| 5 · states measured, ref frames | `2e17ddc16` |
| dev merge (plans-v3 + this) | `3de6d2079` on `dev/srm1-plv3-qc156` |

## Gates against baseline

| Gate | Baseline (Step 0) | Final (branch) | Dev merge |
|---|---|---|---|
| `tsc --noEmit` (8 GB heap; the 2 GB default OOMs) | 7 errors, all `functions/` missing modules | 0 | 0 |
| `vite build` (prod, landing split) | ✓ 417 modules | ✓ 417 modules | — |
| `vite build --mode development` | ✓ | ✓ | ✓ `build:dev` → `index-P-Ljb31B.js` |
| `vitest run` | 4 failed / 12277 passed / 4 skipped; 12 files failed | 3 failed / 12482 passed / 4 skipped; 2 files | 3 failed / 12504 passed |

- The final 3 failures were all in the baseline: `emuGuard.test.ts` (1) and `firestoreTarget.test.ts` (2).
- The baseline's other failing files were the worktree's missing `functions/node_modules`. Symlinking the primary's (for the emulator login) cleared them.

## Locks

**Unit** (all written red first):
- `lib/qc156.test.ts` (12): the line reproduces the ref's 20-point path exactly, an all-zero series is flat with the goal still drawn, and the Views model.
- `qcv156.test.ts` (9): the band, the seals, the page token, the bare strip at rest, the panel and the line block.
- `qcLine156.test.tsx` (8): v154's copy cases moved over from the deleted bar-chart test, plus "the bar chart is gone".
- `qcSlim156.test.tsx` (5).
- `qcViews156.test.tsx` (11).

**Browser** (`tests/e2e/qc156.measure.ts`, emulator harness, 1920 and 1440):
- **V1–V2:** cards, page colour and the toolbar at rest.
- **V3:** panel geometry, the line, and three header states through a dev-only aid.
- **V4:** the collapsing header. The toolbar's top meets the bar's bottom at 0.00px at three scroll positions, the card pins 14px under the toolbar's controls, and the Contact list row behaves as before.
- **V5:** Views. Each view replaces the last, the union of two statuses shows (38 + 6 = 44), Reset works, More filters opens, Tab reaches every control, and the card pins.
- **V6:** day one, quiet, and loading with no layout shift.
- "Red before" for the browser locks is the Step 0 build's readings: tab `#f2eee8`, a painted strip, a white Queried band and white seals, no bar, no Views card.

## What was shared with the Contact list

- **`shell/slimReveal.ts` (`useSlimReveal`):** the slim row's reader and offset, moved out of `ContactSlimRow` unchanged. The Contact list passes its own header and `.clv-main`; the Query Centre passes the navy panel, `.qc153-cl` and `extra: 12` (the toolbar strip's lip).
- **Contact list before and after** (`before-cl-1920*.png` / `after-cl-1920*.png`): the pixel diff is ±1 anti-aliasing plus the Contact list guide's animated ring in the top bar (x 1714–1731, y 67–82). No ground or layout changed.
  - V4 also checks the row in the browser: hidden at rest, shown at 800, 48px, writing `--pin-cover: 60px`, as before.
- The Views card shares the rail's bones only (see premise 1).

## "Where it stands" tile filter

The tiles are gone, but `Qc138Filters.where` remains (the phone page uses it). A remembered visit, a link or the phone page could hold one, which would narrow the desktop list invisibly. An effect in Queries.tsx clears it whenever the desktop page holds one:

```
if (qcDesk && qcF138.where) setQcF138((f) => ({ ...f, where: null }))
```

`qcViews156.test.tsx` locks it.

## What clipped the header's shadow

The toolbar's sticky strip (`.qc154-tbw`). It paints the page colour and has a −12px top margin, so at rest it lay over the header's bottom 12px. It now paints nothing at rest, and takes the page colour and its 22px fade only once stuck (`data-qc156-stuck`, set by QcPage151's existing scroll reader).

No other ancestor clips: between the header and the scroller there is none, and the clipping ancestors above the scroller (`.wpg`, `.ws-window` …) sit outside it.

## Page colour

The tab, its fillet and the sheet read `--ws-page` through `--ink-tab` / `--ink-sheet` on `.ws-main`. While the Query Centre is the page on screen, `.ws-app:has(.qc-wpg--v11:not([data-stage-off] *)) .ws-main` retones `--ws-page` to `246, 243, 238`, and the scroll area paints `var(--ws-page)` instead of a literal. Tab, sheet and page all measure `rgb(246, 243, 238)`.

## Screenshots (`shots/`)

- **Before:** `before-qc-{1920,1440}[-scrolled].png`, `before-cl-1920[-scrolled].png`.
- **Ref frames:** `ref-rest-1920.png`, `ref-collapsed-1920.png`.
- **Cards and tab:** `v1-cards-1920.png`, `v1-tab-meets-sheet-1920.png`.
- **Header:** `v3-page-1920.png`, `v3-header-{streak,none,met}-1920.png`.
- **Collapse:** `v4-rest-1920.png`, `v4-mid-1920.png`, `v4-collapsed-1920.png`, `v5-collapsed-1920.png`.
- **Views:** `v5-rest-1920.png`, `v5-view-{you,over,wait,offers}-{1920,1440}.png`, `v5-more-open-1920.png`.
- **Birds-eye:** `v5-birds[-scrolled]-{1920,1440}.png`.
- **v155's states:** `v6-{dayone,quiet,loading}-{1920,1440}.png`.
- **Collapsed bars side by side:** `v4-collapsed-1920.png` (Query Centre) beside `after-cl-1920-scrolled.png` (Contact list).

## Departures from the ref, with the reason

- **Collapsed bar 60px, not the ref's 65:** the ref's 65 includes its 5px mock offset. The toolbar's controls sit 12px under the bar's hairline (the strip's own padding); the ref shows 7px.
- **Views card 703px tall (ref 640):** the harness has 8 statuses with counts; the ref has 6.
- **Status glyphs are StatusDot, not the ref's stage glyphs:** the prompt asked for StatusDot, and CLAUDE.md says only StatusDot draws a status.
- **The caption's first month is "Jun":** twenty weeks back from w/c 9 Nov is 29 Jun. The ref's mock dates give "Jul".
- **No "for …" line on the harness:** the account has several manuscripts and none is in scope. That is existing behaviour; the line renders when one is.
- **"Export 1 query" in the singular** at a count of one; plural otherwise.
- **Day one through v155's aid draws the account's real sends on the line:** the aid hides rows, not send history (v155 noted this). An empty account's line is flat, as the unit test locks.
- **Birds-eye's date row** is unchanged and hidden under the toolbar when scrolled, as before (premise 7).

## Deferred (named)

- **One Views component for both pages:** the waiting Contact list run (premise 1) should extract `QcViews156`'s card into a shared component rather than copy it. The same applies to the slim bars' visuals (48 vs 60px).
- **Dead CSS left in the older Query Centre sheets** (the brief said not to touch them): `qcv154.css` / `qcv1541.css` rail and goal-chart rules, and `qcv155.css`'s `.qc154-wkc[data-qc155="goal-hold"]`. They match nothing now and need a cleanup pass.
- **A stale comment in `ContactRail27.tsx`** (Contact list, left alone) says `QcRail153` "is not used and does not change". `QcRail153` is now deleted.
- **Merge to main**, and moving the decisions below into `docs/decisions/query-centre.md` at merge (this line predates the CLAUDE.md diet, so there is no `docs/decisions/` here).

## Lasting decisions (for docs/decisions/query-centre.md at merge)

- **The page colour is one token.** The Query Centre retones `--ws-page` on `.ws-main` while it is on screen. Never paint the scroll area a literal again.
- **The toolbar strip paints nothing at rest** and paints only when stuck (`data-qc156-stuck`). Anything that paints there at rest clips the navy panel's shadow.
- **The collapsed bar and the Contact list's slim row share one reader and offset** (`shell/slimReveal`). The bar writes `--pin-cover` on `.qc153-cl` (its bottom + 12); the toolbar and the Views card sit under it.
- **A view is a quick field** (`selectView156` / `viewOf156`), never a second state. Overdue is `past`.
- **`where` has no desktop control** and is cleared on the desktop.
- **Dev-only aid `__SA_QC156_GOAL` = `streak` | `none` | `met`** (or localStorage `sa.qc156.goal`) fabricates send dates for the header states. Its mode gate is at its one call site (`goal156Of` in Queries.tsx).
