# To-do — the tightening (control strip, the column-grid ledger, the aligned card)

The hero tightens to one line, the filters/search/toggle become one recessed control strip, and
both views are rebuilt on a single column system so nothing floats. Refs:
`design-refs/ledger-grid.html` (todo-fix65 — SYSTEM A normative, the fixed column grid; system B
rejected) · `design-refs/card-grid.html` (todo-fix66 — the hero, the strip, the card grammar).

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the hero + the control strip (incl. the refs) | `717feaf` | 2174 |
| P2 — the ledger as a real column grid | `07f3fcf` | 2182 |
| P3 — the card, on the same system | `d4cb515` | 2187 |
| P4 — the sweep + this report | `<this commit>` | 2189 |

Gates green per commit (`tsc` + production build + full Vitest, pipefail); explicit-path staging.
The pack's own suite is `todoTightening.test.ts` (P1 3 · P2 8 · P3 5 · P4 below).

## Phase 0 — findings (the root fault, confirmed)

Exactly as the pack diagnosed. `.tdb-lrow` was `display:flex` with `.tdb-lbody{flex:1}`, so the
tag/status/actions/chevron all took their positions from their siblings' content widths; the
✓ TODAY chip was literally `margin-left:auto`. The cards were flex columns whose actions only
existed inside a hover-revealed 0fr⇄1fr expansion — with no shared height and no pinned foot,
feet could never align. The chips, search and toggle were three separate bare elements on an
open control line; the hero carried a subtitle through the shared PageHeader's `description`.

## What shipped

- **P1.** The subtitle is gone — with no description the shared PageHeader lays title + the two
  actions on one line; the buttons take the ref's 34px page-scoped (the global `.svh-btn` stays
  38px). The control strip is ONE recessed bar (`#f5f0e8`/`#e4dbcd`/r10, pad 6/8): chips
  transparent → `#ece5d9` hover → INK active, counts mono at 60%, zero chips at 40%; the search
  white/hairline/7px/200px; the toggle a white capsule with ink active chips. Sections are one
  line — Playfair 17 label · mono count · a hairline filling the rest (the family-stub bar died;
  the dot column carries family now).
- **P2.** Every ledger row is a grid on `--lg-tracks` (14 · 1fr · 132 · 150 · 132), 56px, with
  the mono column header on the SAME tracks. KIND ≠ STATUS: `kind` = the facet tag (single-source
  with the filter classification), `due` = tabular figures only — "REQUESTED {date}" from
  `q.lastStatusChange` (absent → empty, never invented), "SILENT {n} DAYS", the reply-by
  countdown. The action lane is reserved: chevron at rest, ink primary + ＋/− + clock revealed
  absolutely within the lane on hover/focus-within. Batch rows put progress + count in the status
  lane; member rows join the grid (tinted, inset).
- **P3.** The card is the row stood upright: band = kind + the SAME figures right (two-track
  grid); body = title + ms line + the batch progress in a FIXED slot; foot = the identical lane,
  pinned `margin-top:auto` inside the shared `--card-minh` 150px — which the user note/task cards
  join too, so feet sit level across mixed rows. Four columns standard, five ≥1700. Stickers
  untouched. The hover-verb machinery (vwrap/vstack/cardVerbs, the fixed-height cell + absolute
  surface) is deleted.
- **P4.** Orphan sweep (the old `.tdb-tag` white-pill family, `.tdb-lshow`, the tick-dot
  machinery, `--tdb-cardw/cardh/cardh-g`); `themes.md` gains "The column system"; the tour's
  anchors re-verified (every stop's selector survives — no retarget needed).

## In-browser checklist (dev)

1. **The ledger**: tags, dates and buttons form straight VERTICAL LINES down the page; the mono
   column header sits exactly over each column.
2. **Hover a row**: the action lane's buttons appear IN PLACE of the chevron — nothing shifts,
   the row's width is identical hovered vs not. Tab into a row: focus reveals them identically.
3. **The cards**: feet level across each row — put a two-line title beside a one-line title and
   the primary buttons still align. The batch card's progress sits in its slot; the foot doesn't
   move when it's absent.
4. **The control strip** reads as one bar: chips (ink when active), the search, the toggle,
   nothing floating outside it.
5. **Both views at each width tier**: 4 columns at the standard width, 5 at ≥1700; the ledger
   tracks hold at every width (the task column absorbs the change).

## Deviations (flagged)

- **The ledger's leading-checkbox quick-complete is superseded** with the ref: system A's dot is
  a 9px family marker, not a tick (`ledgerDot` + its hover-tick machinery deleted). Completion
  stays with the flow and Today's own tick — the completion primitive is untouched.
- **"REQUESTED {date}"** reads `q.lastStatusChange` (a Timestamp|string audit field, parsed
  defensively); when absent the status cell is EMPTY rather than showing an invented date.
- **The ✕ SHOWING note** on an expanded batch rides the row's subtitle line (the grid has no
  floating span between lanes).
- **The white tag law is formally superseded**: the `.tdb-tag` pill family is extinct; the
  squared `.tdb-ktag` kind chip is the one tag, and the law's substance (no pink fill, burgundy
  never fills a tag, ★ in markup) carries over — recorded in `todoTagLaw.test.ts` as the
  supersession.
- **The clock triggers are icon-only** in the lanes (aria-label/title from the same
  `VERB_LABELS.later` constant); the labelled form survives only in the journey sheets.
- jsdom mounts nothing: the grid geometry, the no-auto-margin law, the reveal and the tier are
  source/rule-text locks; the straight lines are the checklist above.

## Close

The queue: **deploy rules → dev deploy → prod sequencing pass → Correction UI → notes-store
convergence.**
