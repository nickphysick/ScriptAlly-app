# Query Centre v142 — Cards / List, as the Contact list (v20), with the landing page's query card

Branch `query-centre-v142` (worktree `~/ScriptAlly-qc142`). Not merged to main. The mock and its twelve screens are in
`design-refs/query-centre-v142/`; every SHA256 matched the pack's table before anything was built (they came from
`~/Downloads/query-centre-v142.zip`), and all thirteen are enrolled in `.refhashes.json`.

## 1. False premises and deviations

1. **"Exit full screen" was not there to keep.** The pack says the full-screen toolbar's band, cream toolbar and "Exit full
   screen" are unchanged. Today's pinned toolbar said **"Unpin"**, with the pin icon. It now says "Exit full screen", with
   the Contact list's four corners (oracle 1; the mock draws a pin icon).
2. **The unpinned toolbar was 64px, not 72.** 72 is the pinned height (unchanged). L2's break restores a 72px bar as the
   pack says; it is red at 64 too (the base reading).
3. **The Contact list's ledger heading has no hairlines.** Its v20 rule is "no border and no shadow". The pack asks for
   hairlines above and below, and the mock draws them (`inset 0 ±1px 0 rgba(28,19,15,.07)`), so the Query Centre's ledger
   has them; every other value is the Contact list's.
4. **The mock's "Where it stands" strip column lists statuses.** v141 gave that name to the four sets and renamed the
   status list "Status". The column is headed "Where it stands" and holds the four sets, then a "Status" subheading with
   the statuses.
5. **The query panel has no Materials tab** (its tabs are Tracking / Agent / Notes). A card's Materials opens Tracking and
   scrolls the ledger's "what was sent" slip (`[data-qp="slip"]`) into view. Tracking and Agent open the panel on that tab.
6. **Three cards a row at 1512 is the mock's, not the rule's.** With the sidebar open the list card is 1208px at 1512, so
   the rule (three from 1240px) gives two; the mock's shell is wider. The rule was followed. Three show in full screen.
7. **The toolbar switch's place.** The mock puts it between Group by and Filters; the Contact list (oracle 1) puts it after
   Filters. It is after Filters.
8. **At 1280 in full screen the jump row folded every glyph into "+10 more"** once the switch and a worded "Exit full
   screen" joined the toolbar. The mock folds them too. The Contact list's toolbar Full screen is icon-only at a window of
   1440 or less, so this one is too; three glyphs now show at 1280.
9. **"Export {v} queries" in the applied row means no export while nothing narrows the list**: that row only shows while
   something does. QC1401's "Export all {N} queries" with no filters is therefore retired (§6).
10. **The card's due line uses the row's own next line** (`nextLine`), not the mock's "EXPECTED BY …" wording: the pack
    asks for the row's hot rule, and taking the row's line keeps the words and the colour one decision. So a card reads
    "OVERDUE SINCE 1 JAN" or "18 DAYS OVER" where the mock says "EXPECTED BY 11 JUN · OVERDUE".
11. **The day counter's "resting style"** is the landing's `.mk-lc-day` (with its `Day` label); the odometer is a script
    over that markup, and nothing animates here.
12. **The faces cannot be the landing's token values.** `heroCard.css` reads `--mk-f-*`, which only `marketing.css` may
    declare (it is the one sheet allowed to name Special Elite and Source Serif 4). The card points those tokens at the
    app's `--sp-*`. The rendered faces are the same; the fallbacks differ. L5 compares the first family.
13. **The Query Centre's own font reset beat the landing card.** `qcvPage.css`'s `.qcv-own :where(span, p, div, label)`
    (0-1-0, later in the bundle) won every `.mk-lc*` rule on source order, and every face fell back to Playfair. The card
    sits inside `.qcv-legacy`, the page's existing opt-out for hosted foreign content.
14. **The mock's shell is 8px wider than dev's**, as the pack says; where geometry differed the oracles won.

## 2. Base

`fca4a6d8`, the tip of `dev/…-qc1411-raam-hero3-cl20-about1`. It is what dev served at the start: `index-D9V5t99l.js`,
reproduced byte-for-byte by a local build. It carries Query Centre v141.1 and Contact list v20 (all of v20's code; only
its final report-and-shots commit `4e107626` is not in it).

Baseline gates: tsc 0, build 0, Vitest 637 files / 9,389 passed / 3 skipped (exit 0).

## 3. Shared and copied

| What | Where it lives now | Who uses it |
|---|---|---|
| The title row (count, Cards / List pill, Full screen with its F tip), the icon switch, `FULL_ICON`, `listCountTitle` | `src/components/shell/ViewTitleRow.tsx` + `viewTitleRow.css` | Contact list (`ContactTitleRow` is now a thin wrapper), Query Centre |
| The filter strip's styles (`.cl20-fs-strip`, `.cl20-fsh`, `.cl20-fcol`, `.cl20-chip`, …) | `src/components/shell/filterStrip.css` | Contact list's `ContactFilterStrip`, Query Centre's `QcFilterStrip142` |
| The landing card | **reused, not copied**: `QcCards142` imports `src/marketing/heroCard.css` and builds the card from its `.mk-lc*` classes | Query Centre (the marketing tier is unchanged) |

Both lifts moved the rules verbatim, with their `cl20-*` class names, so the Contact list renders as before: CL20 is
324/324, CL19 / 19.1 / 19.2 all green, and L8 shows the landing card unchanged. Each page passes its own probe
namespace (`data-cl20` / `data-qc142`), because every page stays mounted.

Not shared: the Cards view's grid and ruled heading are built in the Query Centre (`qc142-*`) to the Contact list's
values. Its `ContactCards` is bound to `AgentPaperCard` and `ContactGroupMark`. A lift candidate.

## 4. Per part

| Part | Commit | What changed |
|---|---|---|
| A | `fa70912c` | The shared title row between the hero and the list card ("All N queries" / "v of N queries"); no Pin; full screen's toolbar carries the icon switch and "Exit full screen"; the view remembered in `qh.qc.view`; the guide's step 3 is "Go full screen" (Contact list v20 wording) and spotlights the title row's button; the shortcut sheet and the help article say Full screen. |
| B | `f37eddb0` | The unpinned toolbar 52 tall with 34px controls; glyph buttons 40 × 34, glyph 20, badge 17. |
| C | `88cf0891` | List: the cream ledger heading (full width, mark on the disc column, typewriter name, mono count, hairlines). Cards' ruled heading landed with D. |
| D | `cfe0d051` | The Cards view (`QcCards142`) with the landing card; the ruled heading sticky at the stack's measured height; tabs and the footer link. |
| E | `ecf7d1cb` | The strip (`QcFilterStrip142`) in the sticky stack, live, no footer; Export in the applied row. The pop-over menu, `WhereMenuSection` and their CSS are deleted. |
| Locks | (this commit) | QC142 L1–L8, the icon-only Exit at ≤1440, the re-points, CLAUDE.md, shots and this report. |

## 5. The card's tabs

Yes, the card's tabs open the panel on a tab, through the panel's own `requestPanelTab`:

- **Tracking** and **Agent** open the query on those tabs.
- **Materials** opens Tracking, then scrolls the ledger's "what was sent" slip into view. It polls for up to 2s while the
  panel draws.

Clicking anywhere else on the card opens the query exactly as its row does. The footer link runs the row's next move
through the same `onAct` as the row's tray.

## 6. Locks

Ledgers are in `reports/qc-v142/ledger/` (`base-`, `mut-`, plain = green). The base readings are from a local build of
`fca4a6d8` (`index-D9V5t99l.js`) on the same port.

| Lock | Base (red) | Under its break (red) | Green |
|---|---|---|---|
| L1 title row | 0/2 (no row) | 12/14 (18px left padding) | 14/14 |
| L2 toolbar | 2/12 (64 / 40) | 10/12 (72px bar) | 12/12 |
| L3 no pin | 8/18 (Pin present) | 16/18 (a Pin button put back) | 18/18 |
| L4 parity | 7/28 (no Cards) | 25/28 (source: Cards skip "Where it stands") | 28/28 |
| L5 card format | 0/2 (no cards) | 20/22 (inner border 2px) | 22/22 |
| L6 not covered | 4/41 (no headings) | 33/74 (sticky top 125px) | 74/74 |
| L7 strip | 0/4 (a pop-over) | 24/28 (the strip's own Clear all) | 28/28 |
| L8 landing untouched | reference captured on base | red: 5% of pixels differ (shared card padding 9px) | green (under 0.1%) |

- **L4's break is a source edit**, made in this worktree from a path-derived backup and undone:
  `matches138(r, qcListView === "cards" ? { ...qcF138, where: null } : qcF138, …)`. It cannot be made from outside the
  app. Under it, "Gone quiet" shows 32 in List and 87 in Cards.
- **L6 needed a settle.** Its first run waited a fixed 1.1s after each jump. A long smooth scroll takes longer, so it read
  the heading mid-flight. It now waits until the scroll position holds for three reads. That changed the lock, not the
  app.
- Every lock asserts its population first.

**The older suites (L9).** QC141, QC1411, HR1 (HR1-8 recaptured against the base build), CL20, CL19, CL19.1 and CL19.2
are green. QC140 and QC1401 are green after these re-points:

| Suite · case | What |
|---|---|
| QC140 A1 | Re-pointed: unpinned, four controls (no Pin), 52 tall, 34px controls; in full screen, five (Exit full screen), 72, 40. |
| QC140 B1 | Retired: "Pin cream" and "Pin reads 'Pin list'". There is no Pin; L3 asserts its absence. |
| QC140 D1 | Re-pointed: "Past their reply date" is a chip now, so it reads `aria-pressed` instead of `aria-checked`. |
| QC1401 A1 | Re-pointed: {v} comes from the strip's "{v} of {N} showing" (no Show button); the export is in the applied row. |
| QC1401 A2 | Retired: "no filters: Export all {N} queries" (no applied row, so no export, with nothing narrowing the list). The zero-match state stands. |
| QC1401 B1 | Re-pointed: the step is "Go full screen" and names "Full screen" and "or F" in plain text, as the Contact list's does (the bold F is retired). |

CL19.1/19.2's first run had one `toHaveCount` failure. It did not reproduce: the rerun passed 17/17.

## 7. Screenshots

`reports/qc-v142/shots/`, at 1280 and 1512, matching screens 01–07:

- `01-list`
- `02-cards`
- `03-filter-strip`
- `04-full-screen-cards`
- `05-full-screen-list`
- `06-full-screen-cards-scrolled`
- `07-full-screen-cards-jumped`

## 8. Integration and dev

See the closing section, filled in after the deploy.

## Known gaps, not done

- **Keyboard:** j/k/↑/↓, Enter, L and x move through rows; in the Cards view there are none, so the keys do nothing
  there. Tab reaches each card, its tabs and its link.
- **Loading:** the loading beat draws the list's ghost rows in the Cards view too; the Contact list draws ghost cards.
- **Hover and arrival:** the row peek and the arrival animation belong to rows; cards have neither.
