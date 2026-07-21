# To-do — The Final Shape (hero · floating search · filter rail · grid · run sheet)

Run against HEAD `929137e`. Ref verified (`todo-final-ref.html`, 21 Jul 20:49) →
`design-refs/todo-final.html`; `review-cup.svg` + `focus-art.png` confirmed in
`src/assets/todo/` from v2 (present — not re-copied).

## Phase 0 — recon map (as found at `929137e`)

**Predecessors confirmed:** Command Deck v2 landed in full (`59f0ae2`→`5e85a69`) + the
single-surface hover hotfix (`929137e` — cell+surface, fixed resting cells
`--tdb-cardh 118`/`--tdb-cardh-b 212`, grid-rows verb reveal, focus-visible ring). No drift.

**Retired by this pack, as found:** the identity strip band + contents (`.tdb-strip/.tdb-striprow/
.tdb-tblock`) · the 84×102 post-its + their family solos as UI (`soloPostit`; the pure
`soloFamily/isSoloed/FAMILY_TYPES` reducer stays in `todoFilters.ts`, unit-locked — unconsumed
until something wants family filtering again) · the strip's resident review banner
(`.tdb-rvhead` — re-homed to the sheet docband, same boolean + copy) · the deck bar entirely
(`.tdb-deck/.tdb-deckrow/.tdb-ctl` search home, horizontal `.tdb-pt` pills, `FILTER ▾` fold,
`.tdb-vseg` home) · the v2 rail squares: the Focus square (job → the hero button; `focus-art.png`
stays in assets, reserved for the focused session's opening screen — NOT rendered on this page)
and the settings/Pro squares as squares (→ the rail foot's row + slate square) · the 56px icon
rail + its 1419.98 compact state (→ the P6 overlay drawer at <1428) · exact-fit reels: the
snap track, `REEL_PAGE`, ends state + ResizeObserver, heading pagers `.tdb-reelpg/.tdb-pg`,
the deep-padding overlay room · the old ledger presentation: the 9-col grid
(`.tdb-lgrid/lcols/lrow/ltd/lagn/lstack`), row quick actions (⏸/→), batch-child expansion
(`batchChildren` UI), `truncateRows` capping + SHOW ALL, **and the selection machinery**
(`todoSelection`, shift-click, kfocus, kebab, the bulk bar) — the run sheet has none of it
(reported below).

**Retained:** Today (component + states + popover; 256) · the card contract + the landed hover
expansion (cells/surfaces untouched) · quick-complete (`quickDone`), the Later snoozes
(`snoozeCard`/`snoozeGroup`), Batch-fix wiring · Task Settings sheet · the review mode + the
opened-this-week boolean · help FAB · all derivations (`filterCounts`, `shownX/shownY`,
`sortLedgerDo/Hk`, `hkGroupProgress`, `G3_COPY`).

**Contradiction resolved (pack beats ref):** the ref's drawn run-sheet rows and its LAWS v4 line
say *numbered* step rows; the pack prose overrides twice and in detail — "Rows (no numbering)…
carrying the family dot, not a number", "rows are unnumbered". Built unnumbered; flagged in the
ref's fence note.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the hero + the floating search | `2ffc434` | 1283 |
| P2 — the filter rail | `b5dc2f9` | 1282 |
| P3 — the sheet shell + the docband | `9d86c02` | 1285 |
| P4 — the wrapped grid | `3adb31f` | 1288 |
| P5 — the run sheet | `a1f5a26` | 1281 |
| P6 — sweep · drawer · tour · a11y | `4379ef1` | 1277 |
| report | `<this commit>` | 1277 |

Gates green per commit (`tsc` + build + full Vitest, pipefail); explicit-path staging. The suite
figure falls as retired machinery took its tests with it (todoSelection's 7, the ledger-table
locks, the old tour snapshot) and the Final Shape describes landed.

## Removed vs re-homed (as executed)

**Removed:** the identity strip + 84×102 post-its + family solos as UI · the deck bar · the v2
rail squares + the 56px icon rail + its 1420 break · exact-fit reels (track, snap, `REEL_PAGE`,
ends/RO, pagers `.tdb-pg/.tdb-reelpg`, the deep scrollport padding) · the 9-col ledger table
(grid, quick ⏸/→, batch-child expansion, SHOW-ALL truncation) · **the entire selection
machinery** (`todoSelection` deleted; checkboxes, shift ranges, bulk bar, kebab, the additive
keyboard layer) · the strip review banner (`tdb-rvhead`) · reel class names (`.tdb-lane` now).

**Re-homed:** the focused session → the hero's ink button (whole-board scope; the phrase
"Begin focused session" deliberately reinstated) · search → the floating 540×46 pill (⌘K, Esc
chain, live both views) · filters → the rail's vertical quiet pills + RESET + lens (same
reducer/state; the ⚲ FILTER drawer below 1428) · Task settings + Pro → the rail foot (row +
slate square) · the view segment → the sheet corner (same `sa.todoView`) · the review → the
docband (same boolean/copy) · the ☰ view → the run sheet (same handlers, verbs in place) ·
Today untouched (popover trigger beside the search below 1240).

## In-browser checklist (dev)

1. The hero's two objects; the search pill breaking the hero's bottom edge by half its height,
   centred on the assembly (1364 = 248+24+812+24+256) at 1440 and 2560.
2. A rail pill and the search narrowing ONE shared state; the burgundy SHOWING x OF y · RESET
   row appearing under SHOW; Esc clearing search first, filters second.
3. The docband flipping ink "Open it ›" → ghost "View again" after finishing the review.
4. ▦: the grid scrolling vertically with sticky lane headings sliding rows beneath; the hover
   expanding seamlessly (the hotfix's single surface, unchanged).
5. ☰: the run sheet — unnumbered family roundels, verbs fading in place on hover AND keyboard
   focus, nothing growing; a filter re-deriving both views identically.
6. ⚡ FIX {n} → opening Batch fix from a grid card AND a run-sheet row.
7. <1428: the ⚲ FILTER · x/y pill beside the search opening the focus-trapped drawer (Esc and
   scrim close); <1240: the Today chip beside the search.
8. The tour end to end (six stops, ending on Today).

## Deviations

- **Unnumbered rows** (pack beats ref): the drawn numerals + the LAWS' "numbered step rows"
  line are overridden by the pack's explicit "no numbering… the family dot, not a number".
- **Batch rows omit ＋ TODAY** (the ref draws it; groups still have no commitment primitive —
  the v2 resolution carries forward).
- **Transitional commits**: P1 removed the deck before the rail (P2) and corner segment (P3)
  re-homed filters/view — one-commit gaps inside the run-through, state persisting throughout.
- **The review banner parked** at the sheet top during P1–P2 (same boolean) before P3's docband.
- **`todoLedger` lib survives largely intact** — `ledgerDetail` feeds `sendKicker` (the sheet
  kicker's one source); only the page-side table consumers died. `soloFamily`/`isSoloed` stay
  in `todoFilters` (pure, unit-locked, currently unconsumed).
- **jsdom limits** as ever: overlap geometry, stickiness, drawer trap and the hover feel are
  rule-text/structure locks — the browser walk confirms the pixels.

## Deploy checkpoint

**The redesign is complete; nothing queues before dev deploy and the prod sequencing pass.**
