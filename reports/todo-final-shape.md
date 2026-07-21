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

*(Phases append as they land.)*
