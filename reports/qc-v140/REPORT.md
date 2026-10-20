# Query Centre v140: the Contact list's list, pinned and unpinned

Branch `query-centre-v140` (worktree `~/ScriptAlly-qc140`). Built 19 Oct 2026.
Integration branch and dev build: see §6. **Not merged to main.**

## 1. False premises and differences from the pack

The pack's values were followed where they apply. Where the app could not take a value, or the pack assumed something the app does not do, it is listed here first.

**Where this runs**
- **Contact list v19.1 was not on the base.** Dev served d6d63ba2 (`…-qc139-dv1b-cl19`, `index-LypZ-ruq.js`) when work began. v19.1 reached dev during the build, so the integration branch is cut from the v19.1 tip (§6).
- **v19 built every list part page-local.** The pack expected a shared toolbar, chips, filter menu, applied row and jump row. None was shared. The Query Centre therefore has its own copy of each, built from the same values; they are listed in §4 as lift candidates. Only `usePopover` / `quietScroll` (`shell/ListPills`) and the sticky stack (`useStickyStack`) are genuinely shared.

**A · The toolbar**
- **The Next action groups have the app's names, not the mock's.**
  - The short jump labels go by group key: Offer, Close?, No reply.
  - The closed groups (Passed, No reply, Withdrawn) all carry the one grey closed glyph with no badge, as v139 C drew them, so A2's "no two neighbours share a mark" can only hold for the badged groups. The pack's own table gives Passed and No response the same mark. A2 asserts the rule over the badged groups.
- **"Who it's with" draws art for its Closed band too**, as v139 did.
- **No grouping is one band-less list.** On the desktop, ungrouped jumps go by month on the sort column, or by CHANGED where the column has no date.
- **The jump buttons are 34 tall in a 40 row**, as the mock renders them.
- **Find narrows to 210 at 1280** (≤ 1120 of toolbar), and below 1000 the Pin and Filters labels drop to icons.

**B · Unpinned**
- Done as v19.1 F (navy toolbar, 18px corners, cream Pin). Applied chips keep a 16% ink ring and the applied Filters chip goes navy, so the applied state still reads on the navy bar.

**C · Pinned**
- **The band's content starts 196 in, not the mock's 210.** The mock's card is wider than the app's sheet; 196 clears the hawk by the same margin.
- **The pinned toolbar is 72 tall (the pack's value) where the mock draws 64.** The headings are 40 (mock 37).
- **The heading rule is ink at 10%, not the mock's navy at 20%.** On the cream toolbar the navy rule reads as a second edge.
- **The hawk is not shrunk at 1280.** At 137 × 126 it already clears every control (C4).
- **"Heard back" counts what `lib/responses` places**: asked for more plus passed, over every query. A Signed query has no placement, so it counts in the total but not in heard back. Harness account: 87 queries, 52% heard back, 31 asked for more, 35 overdue.
- **QC138.6 A1 needed retargeting.** Its rendered half pressed the old pin circle (`.plb`), which this pack removes. It now presses the toolbar's Pin.

**D · Menus and the applied row**
- **"Due this week" is described as "the next seven days"**, which is what `dueThisWeek` does; the mock says "by Sunday".
- **Opening Filters where the menu would run past the window first scrolls the list quietly**, so the toolbar sticks and the menu fits.
- **The applied row has two chips the pack doesn't name**, for the older sentence filter (`qcFilter`) and the strip's court. Both can still be set from elsewhere on the page, so leaving them out would hide a live filter.

**E · Columns**
- **The column thresholds are read off the sheet's own width.** The mock's "frame" is the main column beside the sidebar, which a container query cannot see. The pack's 1150 / 1350 of frame becomes 1094 / 1294 of sheet unpinned and 1142 / 1342 pinned (frame minus the measured inset of 56 or 8).
- **What you sent is `minmax(150px, var(--sent-w))`, not a flat 15%.** At 1280 with the sidebar open, the minima fill the rows' 896px exactly while 15% of the frame is 154.8. The column gives back to 150 there.
- **First queried's heading overflows its column at 1280**, as it does in the mock.

**F · Memory, arrival, no footer**
- **The arrival slides the bands as well as fading them**, as the rows do. It does not hold on hover.
- **The older sentence filter (`qcFilter`) is not remembered.** It is not one of the filters the pack lists.
- **⚠️ Export CSV is no longer reachable on the desktop.** It lived in the list's footer, and the pack removes the footer. The phone keeps both. This needs your ruling: drop it, or give it a home (the Filters menu's footer, or the toolbar).

**G · Getting started**
- **"Pin the list" waits for the first query**, like Find, Open and Birds-eye: an empty account draws no list and so no Pin button.
- **At 1280 the card says "Press **Pin list**" while the Pin button is icon-only** (the label drops below 1000 of toolbar). It needs your wording, or the label kept at 1280.
- **Pressing F pins the list on the Contact list too, which shows "F" on its Pin.** That is CL18.2 C5, unchanged; it is noted only because the guide now teaches F on the Query Centre.

## 2. The base

- **Tip:** d6d63ba2, the branch `dev/…-qc139-dv1b-cl19`, which dev served as `index-LypZ-ruq.js`. Building it reproduced that hash.
- **What it carries:** Query Centre v139, v138.6 (the shared pin hook and the sticky stack) and Contact list v19.
- **Contact list v19.1 was not on it** (see §1).
- **Baseline gates:** tsc 0, `vite build` 0, `build:dev` 0, Vitest 613/613 files.

## 3. What changed, part by part

| Part | Commit | What and where |
|---|---|---|
| refs | `b9dfa9bd` | The mock and its 26 screens in `design-refs/query-centre-v140/`, SHA256s verified, enrolled in `.refhashes.json`. |
| A | `27296c09` | `QcToolbar140.tsx` replaces the navy list header with one row: the jump row, Find, Group by, Filters and Pin. `bandMarks.tsx` holds the band marks, now shared by the band and the jump row. `lib/qc140.ts` adds `jumpLabel`, `jumpColumn` and `monthJumps`. Folding into "+N more" is measured against the row's own rect. |
| B | `55648cc3` | The unpinned dress, `qcv140.css`: navy toolbar, cream jump row, white controls with no ring, cream Pin, card corners 18. |
| D | `6924b3ea` | `QcFilterMenu140.tsx`: the Group by menu (with Rows), the Filters menu (v19 layout A) and the applied row. `Qc138Filters` gains `you` and `waiting`. Overdue IS `past` and Offers IS `offers`, so each quick pick has no state of its own. |
| C | `42b559c6` | `QcBand140.tsx` and `bandFigures` (`lib/qc140.ts`). Pinned, the list is flush to the sheet with the tab and lip in navy (`html[data-qc140-pinned]`); cream toolbar; white headings; the hawk across the band and toolbar. |
| E | `5243b73c` | One column template for headings, rows, the peek and the drawer, with the gaps set by container query. The agent's name carries a `title`. |
| F | `e3ffec49`, `ef5e84f9` | `lib/qcViewMemory.ts`: `qh.qc.view` per device (grouping, sort, density; migrates `sa.qcList.v1`) and `qh.qc.filters` for the visit (filters, search, scroll). Both are read in the state initialisers. The arrival uses Web Animations and waits for the route. No footer under the list on the desktop. |
| G | `98334d5f` | `lib/pageChecklist.ts`: six items, with "Pin the list" third. It ticks from the pin's real state: button or F, never a remembered pin. |
| H | `5c8d7d16`, `98fae0af` | `tests/e2e/qcV140.measure.ts` (A1–G1), `qcV140Mutate.sh`, `qc140Figures.mjs`, `qcV140Shots.measure.ts`. |

## 4. Shared or copied — the lift candidates

**Shared with the Contact list (used as they are):**
- `usePopover` and `quietScroll` (`shell/ListPills`): one popover at a time, Escape at page level, and no closing on the page's own scroll;
- `useStickyStack` (v138.6);
- `usePinList` (v138.6);
- `PageChecklist` and `lib/pageChecklist` (the guide); the only change is a target text that can hold a node, which is additive.

**Copied from v19's values (lift candidates):**

| Query Centre | Contact list v19 original |
|---|---|
| `QcToolbar140.tsx` (jump row, fold, Find, chips, Pin) | `agents/contact/ContactListHead.tsx` |
| `QcFilterMenu140.tsx` (Group by menu, Filters menu, applied row) | `ContactListHead.tsx` + `ContactFilterStrip.tsx` |
| `qcv140.css` (the toolbar, menus, applied row, pinned scheme, columns) | `contactV19.css` (with the v19.1 F dress) |
| `QcBand140.tsx` (the pinned band and its art) | the pinned band in `ContactListHead.tsx` |
| `bandMarks.tsx` `JumpMark` | `ContactGroupMark.tsx` |
| the navy tab and lip while pinned (`html[data-qc140-pinned]`) | the Contact list's pinned lip |
| `lib/qcViewMemory.ts` | `lib/contactListMemory.ts` |
| the arrival (Web Animations in `QcList138`) | the Contact list's arrival |

## 5. Locks

Each lock was red on the base, red under its named break, then green on the branch and again on the integration build.

| Lock | Base (d6d63ba2) | Break | Green |
|---|---|---|---|
| A1 one row | red, crashed: no toolbar to read | `page:A1` red: A1 · 1512 unpinned one line (every top within 2px) — 431.9,481.9,481.9 | 20/20 |
| A2 jump labels | red 10/12: 1512 buttons — 0 | `drop-badge` red: A2 · 1512 no two neighbouring badged groups share a mark — of/- q/- fr (first break left it green; see notes) | 12/12 |
| A3 fold | red, crashed: no jump row | `offset-left` red: A3 · 1512 unpinned every visible button ends inside the row — {"rowW": | 19/19 |
| A4 jump | red 0/4: 1512 group: buttons — 0 | `ignore-stack` red: A4 · 1512 m:2026-01: its first row lands under the stack — 190.859375  | 12/12 |
| B1 unpinned bar | red, crashed: no toolbar | `page:B1` red: B1 · 1512 toolbar navy — rgb(255, 255, 255) | 10/10 |
| C1 pinned scheme | red, crashed: no band | `page:C1` red: C1 · 1512 the list's left is the sheet's (±1) — {"sheetL":68,"sheetT": | 10/10 |
| C2 no repeats | red 2/4: 1512 the band is there —  | `page:C2` red: C2 · 1512 no court words — 87queries35overdue52% heard back31 asked fo | 4/4 |
| C3 figures | red 2/10: 1512 {N} queries —  vs 87 | `noreply-heard` red: C3 · 1512 heard back — 54% heard back vs 52% | 10/10 |
| C4 illustration | red 0/4: 1512 @0 the drawing is there —  | `page:C4` red: C4 · 1512 @0 no ancestor clips it — qc140-band | 20/20 |
| D1 one state | red 0/6: Overdue pick on → the reply-date switch on — {"chips":[]} | `own-state` red: D1 · Overdue pick on → the reply-date switch on — {"over":"true","past; `band-own-state` red: D1 · pinned: the band's disc on → the switch and the pick on, one chip (first break left it green; see notes) | 7/7 |
| D2 escape | red 4/8: 1512 the menu opened —  | `esc-pin-first` red: D2 · 1512 Esc closed the menu — | 8/8 |
| E1 columns | red 10/20: 1512 unpinned Agent ≤ 264 — 291.96875 | `agent-grows` red: E1 · 1512 pinned Agent ≤ 264 — 301.484375 | 20/20 |
| F1 memory | red, timed out: no Find in the toolbar | `restore-after-paint` red: F1 · 1512 grouping restored at the first frame — Grouped byWho it's wi (first break left it green; see notes) | 12/12 |
| G1 guide | red 2/5: the pill reads /6 — Query Centre: Getting started 2/5 | `tick-guide-button` red: G1 · Pin the list ticked — {"seen":true,"done":{"log":true,"find":true | 5/5 |

**Green on the integration build: 14/14 tests, 169/169 readings.** Branch build: 14/14, 169 readings.

**Notes on the breaks:**
- **Three of the first breaks left their locks green, and each was answered rather than waved through:**
  - **A2:** the probe read the jump mark's `data-badge` attribute, which survives a badge that is never drawn. It now reads the drawn badge.
  - **D1:** the first break hit the band's disc, which D1 never looked at. D1 now has a pinned half (the disc, the switch and the pick are one state). The pack's break, "give the pick its own state", moves the pick's field.
  - **F1:** a `useEffect` restore is genuinely harmless, because the rows draw only after the data arrives, well after the effect. The break now restores the grouping after the rows have drawn.
- **The source breaks are in `tests/e2e/qcV140Mutate.sh`.** Each is backed up by path and put back from the backup, never with git.
- **The page-side breaks (A1, B1, C1, C2, C4) run through `QC140_MUTATE`.**
- **Every break's first red line** is in `mutations.jsonl` beside this report.

**L1 (on the integration build):**

| Suite | Integration build | Notes |
|---|---|---|
| QC140 | 15/15 (14 locks + auth) | the table above |
| CL19 (`contactV19`) | 15/15 | unchanged by this pack |
| CL19.1 (`contactV191`) | 9/9 | unchanged by this pack |
| QC139 | 11/14 on the first run, then 14/14 | **A1** expected "/5" and **C1** read the old list title. Both claims moved with v140 (six guide items; the title replaced by the Group by chip) and were re-pointed (`85e72ee6`). **B2**'s one red (the practice drawer read empty straight after opening) passed twice running on its own: a timing flake, not a fault. Pip's steps matched a real query's for all five answers in every run. |
| QC138.6 | 6/10 on the first run, then 10/10 | **A1, A2, A5, B1** read the old pin circle (`.plb`), the old Filters button and panel, and the old header's place. As the pack foresaw, they were re-pointed at the toolbar's own Pin and tip, the new Filters chip and menu, and the pinned stack (the band flush to the sheet, the toolbar 72 under it). The Contact list halves are untouched. |

All five ran with the Query Centre guide marked seen (its first-visit open covers the list). The account's guide state was put back afterwards: `{"seen":true,"done":{"log":true,"open":true,"find":true}}` before and after.

## 6. Integration and dev

- **What dev served when the pack began:** d6d63ba2 (`…-qc139-dv1b-cl19`, `index-LypZ-ruq.js`), the base.
- **What dev served at deploy time:** `…-dv1b-cl19-cl191` at 2f17874f (`index-bC-f_N1T.js`, Contact list v19.1), re-checked immediately before the deploy.
- **Integration branch:** `dev/main-cl18-…-cl19-cl191-qc140`, cut from 2f17874f.
  - It merges `query-centre-v140`; the merge commit is a9610bd0, pushed.
  - Only `design-refs/.refhashes.json` conflicted (both sides added entries), resolved as the union; `check-design-refs` passes 649/649.
- **Gates on the integration tree:** tsc 0, `vite build` 0 (no errors or warnings), `build:dev` 0, Vitest 615/615 files (9,142 passed, 3 skipped).
- **Locks on the integration build:** QC140 14/14 and the L1 suites (§5).
- **Deployed to dev only**, from a clean detached checkout of a9610bd0, as hosting only: `index-BH-rXrRP.js`.
  - It is the same bundle the locks measured. The report's own commit touches only `reports/`, so the bundle is unchanged.
- **Not merged to main. Prod untouched.**

## 7. Shots

`shots/` holds one image beside each `design-refs/query-centre-v140/screens/*` state, at 1512 × 900 and 1280 × 800, taken on the integration build. 05 is "+N more"; where nothing folds at a size, the file is named `-none`.

The pinned shots (09–12) are where v19.1's change meets this one: v19.1 raised the pinned head above the sheet lip, and v140 turns the lip navy while pinned. They meet cleanly, with no cut across the hawk at either size.
