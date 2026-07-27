# To-do — alignment fixes (equal gutters · cards fill the panel · the warm highlight)

Two corrections from the live review of the polish pass. `design-refs/todo-shell-polish.html`
(todo-fix50) is normative for the intended geometry and the active-fill tone.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| the ref (todo-fix50) | `515ff6e` | — |
| P1 — equal gutters + the grid fills the panel | `a91623b` | 1513 |
| P2 — the warm active fill | `b9289df` | 1513 |
| P3 — the sweep + this report | `<this commit>` | 1516 |

Gates green per commit (`tsc` + production build + full Vitest, pipefail); explicit-path
staging.

## What shipped

- **P1 — equal gutters + fluid grid.** The left-heavy column was a **double scroller + scrollbar
  asymmetry**: both `.tsh-body` and `.tdb-wrap` had `overflow-y:auto`, and the scrollbar shaved
  the centred column's right gutter. Now `.tsh-body` clips and column-lays the wrap, the wrap is
  the sole scroller, and it reserves the scrollbar gutter on both edges
  (`scrollbar-gutter: stable both-edges`) — the column's side gutters stay equal at every width.
  The card grid becomes **fluid**: `repeat(3, 1fr)` standard, `repeat(4, 1fr)` only at the
  existing ≥1700 tier — the cards grow to fill the panel's inner width (no dead space right of
  the last column) rather than more columns appearing. The old "today-off → 4-up at every width"
  rule (which forced 4-up everywhere once Today became the corner pop-up) is retired. The
  sticker clearance holds (the 14px gap ≥ the 5px offset), and the batch + Expand-n cells
  stretch with their tracks.
- **P2 — the warm active fill.** The selected fill read green because the shell inherited the
  app's `--rail-pill`, which the theme editor retoned to sage (`#e9ece4`). The shell now owns
  its active fill directly: **`#e6ddcf`** — the sidebar's own parchment (`#f2ede7`), one step
  deeper, zero green — with the hover a step between at **`#ece5d9`**. Applied to nav items and
  filter rows alike (the filter pills read the same `--tsh-active-bg` / `--tsh-hov`), still with
  no border, outline or shadow. The warm `--rail-*` neutrals (label / hair / itemtx) stay
  shared; only the two green-cast reads are replaced.
- **P3 — the sweep.** No fixed-width grid track (`repeat(N, var(--tdb-cardw))`) and no live sage
  fill read (`--rail-pill` / `--rail-hov` / `#e9ece4`) survives (grep-locked; the only `#e9ece4`
  left is an explanatory comment). `themes.md` gained the fluid-track law and the active-fill
  pair.

## In-browser checklist (dev — the page is auth-gated, so this is Nick's eyeball)

1. **Measure both gutters** — left == right at a couple of window widths; the column no longer
   sits left-heavy, and there's no double scrollbar.
2. **The last card column lands on the panel's inner edge** — the cards are visibly larger,
   filling the width, with no dead strip on the right. At ≥1700 it steps to 4-up; below, 3-up.
3. **The selected rows** (the lit To-do nav item and the active filter, e.g. "Show all") sit in
   a **deeper parchment with no green cast** — same warm hue as the sidebar, one step down.

## Deviations (flagged)

- **`scrollbar-gutter: stable both-edges`** reserves gutter space on both sides even when no
  scrollbar is shown, so the gutters stay equal regardless of scroll state or platform
  (overlay vs classic scrollbars). Modern-browser feature; the app already targets those.
- **The ref draws the active fill as `#eae3d6`; the pack prose specifies `#e6ddcf`.** Per the
  global "prose wins" rule I used `#e6ddcf` (and hover `#ece5d9`, casing normalised as the pack
  directed).
- **The grid keeps the fixed cell HEIGHT** (`--tdb-cardh`); only the width goes fluid, so cards
  grow wider (more horizontal room, less wrapping) at the same height — matching the pack's
  "cards resize larger to take the room".
- jsdom mounts nothing: the gutter equality and the last-column edge are computed-geometry
  checks (Nick's in-browser list); here they're source/rule-text locks over the scroller,
  the fluid tracks and the tokens.

## Close

The queue: dev deploy → prod sequencing pass → Correction UI.
