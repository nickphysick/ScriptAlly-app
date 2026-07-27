# To-do — shell polish (centred column · subtitle · sticker cards · drawer-grammar sidebar)

An amendment pack over the deployed workspace shell — five fixes from the first live review.
`design-refs/todo-workspace-shell.html` remains the structural ref; where this pack differs,
this pack wins. The pastille card system, the ledger, grouping, undo toasts and the derived
engine stay untouched.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the centred column + chrome gap | `be303d3` | 1490 |
| P2 — the Playfair subtitle | `d10d3f3` | 1495 |
| P3 — sticker cards | `88b241d` | 1495 |
| P4 — the sidebar in the drawer's grammar | `bf13cac` | 1501 |
| P5 — the sweep + this report | `<this commit>` | 1509 |

Gates green per commit (`tsc` + production build + full Vitest, pipefail); explicit-path
staging. Lock suite: `src/components/todo/todoShellPolish.test.ts` (19 tests).

## What shipped

- **P1 — the centred column.** The hero row and the panel now live on ONE centred max-width
  column (`.tdb-col`, `--tdb-col-max 1360px`, `margin-inline:auto`) with equal side gutters
  (`--tdb-col-gutter 40px`) that grow with the viewport. The hero row carries no side padding
  and the panel fills the column, so the title is flush with the panel's left edge and the
  CTA/review pair flush with its right — one column, one pair of edges. A `--tdb-chrome-gap`
  (44px) of air sits under the breadcrumb bar as the column's top padding. The gutters moved off
  the wrap (now the bare scroller) onto the column, so nothing double-insets.
- **P2 — the subtitle.** Playfair 17px regular in warm grey `#7a6a5e`, ~6px under the title (up
  from the quiet 11px grey). Copy: "and notes" → "notes" — "Urgent tasks, housekeeping, notes.
  Here's everything on your to-do list." Nothing else in the hero changed.
- **P3 — sticker cards.** The family task cards in the cards view (both sections + batch cards)
  wear a 1.5px ink border (`--tdb-sticker-bd #3a1c14`) and a hard offset block behind
  (`--tdb-sticker-off 5px 5px 0`, no blur) in the family colour — urgent pink `#f2cec1`,
  housekeeping latte `#eee5d4`, notes butter `#eedfae`. Hover lifts one step (block → 6px, card
  → `translate(-1px,-1px)`), gentle. The pastille bands + white pills inside are unchanged; the
  grid gap moved to `--tdb-grid-gap 14px` (≥ the 5px offset) so blocks never touch. The ledger
  rows, the Today pop-up and the session page are not stickers (the treatment is scoped to
  `.tdb-tile.do/.hk/.nt` + `.tdb-gcard`).
- **P4 — the drawer-grammar sidebar.** The sidebar mirrors the app NavDrawer, extracting its
  shared `--rail-*` tokens (the drawer's own fallbacks are the values, since `.t-f12` doesn't
  theme them) rather than duplicating hexes. Section labels (WORKSPACE + FILTER) take the
  drawer's mono `.18em` with a hairline rule beneath; rows take its 35px height / radius 9 /
  gap 12 / 12.5px type / 16px icon / muted counts, and the nav glyphs become the drawer's own
  lucide icons. **The active state — nav items AND filter rows alike — is the drawer's faint
  parchment fill only** (`--rail-pill #f1e9df`, weight 600): no border, no shadow, no outline,
  never burgundy. The shell pack's white-card active variant and the ink outline on the selected
  filter ("Show all") are both retired. All reactive filter behaviour — counts, zero-dimming,
  the struck old totals, the query chip — carries over unchanged.
- **P5 — the sweep.** The white-card fill (`#fdfcfa`) and the filter ink outline
  (`inset 0 0 0 1px var(--ink)`) are grep-asserted gone. `themes.md` gained the polish
  amendment (the centred column + gap tokens, the subtitle spec, the sticker card law, the
  drawer-grammar sidebar) and the shell section's white-card law is marked amended. The tour's
  Today anchor dropped the removed `.tdb-todaychip`; all six anchors are live.

## In-browser checklist (dev — the page is auth-gated, so this is Nick's eyeball)

1. **Equal gutters** each side of the content, growing with the window; the title sits on the
   panel's left edge and the Begin/review pair on its right edge.
2. **Air under the bar** — a comfortable gap before the title, no longer squashed.
3. **The Playfair subtitle** in warm grey with the new copy (no "and").
4. **Sticker cards** — each card an ink-outlined block with a family-coloured offset shadow
   (pink / latte / butter); hover gives a gentle lift, not a mode change. The **ledger stays
   flat** (rows, not stickers), and Today's pop-up + the session page are untouched.
5. **The sidebar reads exactly like the drawer** — mono hairline-ruled section labels, lucide
   icon rows, and **faint-fill selection** on the active nav item and the active filter (no ink
   outline, no white card).

## Deviations (flagged)

- **"via TypeGlyph" → lucide.** The pack specifies the nav rows' icons "via TypeGlyph", but
  TypeGlyph is a locked component bound to the three material `ComponentType`s and cannot render
  nav icons (Dashboard, Queries, …). The NavDrawer itself uses `lucide-react`, so the faithful
  mirror uses those icons (LayoutGrid · Send · Users · ListTodo · FileStack · Settings ·
  HelpCircle). No locked component was edited.
- **The `--rail-*` tokens are read with the drawer's fallbacks**, not redefined under `.t-f12`
  (which doesn't theme them). This is the "extract shared tokens rather than duplicate" rule —
  both the drawer and the shell read `var(--rail-pill, #f1e9df)` etc.
- **The search pill keeps its own hairline border** (`--tsh-active-border`) — it's a bar
  control, not a nav row, so it stays a white pill rather than adopting the borderless row look.
- **The grid gap is 14px** (≥ the 5px offset with headroom), a token bump from 12; the cards
  themselves and the 3-/4-up tier logic are unchanged.
- jsdom mounts nothing: the column geometry, the edge alignment and the drawer parity are
  source/rule-text locks over shared tokens; the browser checklist confirms the pixels.

## Close

**Polish done.** The queue: dev deploy → prod sequencing pass → Correction UI.
