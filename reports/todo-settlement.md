# To-do — the settlement (stone headers · the search · the pair's new seat)

Run against HEAD `619bd89` (the v9 session, deployed to dev). **The colour question is
closed**: the soft pastille card system is untouched and declared settled — pink urgency,
latte housekeeping, butter notes, white tag pills, exactly as deployed. This pack changed
container structure and the hero's furniture only. It supersedes `todo-blush-prompt.md`,
which was **never run**.

Ref: `todo-fix39.html` → `design-refs/todo-settlement.html` (normative, fenced). Boards
fix31–fix38 are exploration history — not refs.

## Phase 0 — recon

- **Blush pack: unrun.** No prompt file, no blush refs, and **zero** blush/greige tokens in
  `todo.css` — so there was no blush set to replace, only the exploration to fence off.
- **Three headers, three treatments, three heights** (all padding-derived): the FILTER band
  `.tdb-rsech.fc1` (gradient `#f4f3f1→#f0eeeb`, `#e5e3de` rules, 8/16) · the document bar
  `.tdb-dochead` (same gradient, 10/18) · Today `.tdb-th` (**diary sage** `#d7ddd5→#d5dbd3`,
  `--hk-spine` rule, 11/14, baseline-aligned).
- **Search**: 380 × 46, font 13, a 34px glass. **The pair**: `.tdb-heropair` in the hero, 44px
  Begin + 44px review chip. **The toggle**: `.tdb-vseg`, 30px with 30×22 buttons, already the
  document bar's rightmost resident.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| the ref, fenced | `a01f390` | 1452 |
| P1 — stone headers, one height | `2fe3c33` | 1452 |
| P2 — the search grown + the clearance | `d06e94a` | 1456 |
| P3 — the pair's new seat, in the bar | `ac27f99` | 1462 |
| P4 — the sweep + this report | `<this commit>` | 1466 |

Gates green per commit (`tsc` + production build + full Vitest, pipefail); explicit-path
staging. New lock suite: `src/components/todo/todoSettlement.test.ts`.

## What shipped

- **P1 — stone, one height.** All three container headers read one fill (`#f5f3f0`) and one
  bottom rule (`#e6e2db`) from shared tokens on `.tdb-wrap`, at one height —
  `--container-head-h: 36px` — with contents flex-centred. No padding-derived heights survive;
  each header keeps its own container's top radii. **Today's sage header is retired**; sage now
  lives only at glyph scale (row dots, completion ticks, StatusDot incoming), untouched.
  Typography stays per container: mono FILTER warmed to `#8a8074`, the Playfair bar line and
  Today's title in `#3a332c` (the bar line stepping 14.5 → 12.5 so it sits inside 36), Today's
  count mono `#8a8074`. The view toggle restyles onto stone — translucent track, shared rule,
  26px — active chip unchanged.
- **P2 — the search, grown.** 460 × 46 (`--tdb-search-w` / `-h`), font 13, the glass scaling to
  32px; placement, ⌘K and behaviour unchanged, the responsive floor now expressed as
  `max-width: calc(100vw - 2 × --tdb-edge)`. **The clearance law**: `--tdb-search-clear: 40px`
  is a minimum band of clear ground below the pill, carried as the search row's *own* bottom
  margin — nothing occupies it, no child's margin can collapse through it, and it is declared
  exactly once so it holds at every tier (and survived the pair's departure). The v9 sub-slot
  law re-verified: the slot's min-height tracks the pill and the session's region is measured
  from the row's real bottom, so the 48px band simply moves down with it.
- **P3 — the pair's new seat.** Begin and Last week in review moved into the sheet's 36px bar
  as 28px pills at 11px, right-aligned; the bar reads **line → pair → 20px hairline divider →
  view toggle** (still the rightmost resident), and the bar does not grow. The hero is title +
  search only. Session wiring followed the seat: the opening fades the pair and unmounts it
  once composed *from the bar*, returning it on exit, while the bar and toggle ride the
  document bar's own exit as the sheet dissolves. **Tab order** is search → the bar's controls
  left-to-right → the filter rail: the sheet now leads in the DOM and the rail keeps its left
  seat via `order: -1`.
- **The collapse tier, measured** (`--tdb-bar-collapse`). Measured in-browser against the real
  loaded fonts: bar line 209px (three-digit worst case) + pills 124 / 112 + divider 5 + toggle
  62 + gaps 34 = **546px** of content, against `viewport − 94` of chrome (32×2 wrap edge, 14×2
  bar padding, 2 sheet border) — so a genuine collision at **640px**. The token is set to
  **680px** (a 40px cushion, so the line never sits flush against the pills); below it the
  pills go icon-only with their labels on `aria-label` + `title`, before any text wraps, and
  the toggle never collapses. At the normal sheet width (812) the cluster has ~236px of slack.
- **P4 — the sweep.** `design-refs/themes.md` gained **"To-do containers — stone (settled)"**:
  the stone pair, the 36px law, pastille-cards-are-signal, sage-at-glyph-scale, and a note that
  no blush set was ever adopted. Blush/greige greps are zero in To-do scope. The tour's Begin
  stop keeps `.tdb-herobegin` — the anchor followed the seat into the bar, and every other
  stop's anchor still exists.

## In-browser checklist (dev)

1. **Three stone headers, level**: the FILTER band, the sheet's bar and Today all the same
   fill, the same rule, the same 36px — measure them against each other.
2. **Sage only in glyphs**: Today's header is stone; the row dots, the completion ticks and the
   StatusDot incoming states still carry sage.
3. **The larger search**: 460 × 46 with the 32px glass, and a clear 40px band beneath it before
   the containers — at a wide window and a narrow one.
4. **The pair in the bar**: riding right of the Playfair line, with the hairline divider and
   the toggle beyond it. Squeeze the window below ~680px: the pills become ▶ and ↺ (hover for
   the labels), the toggle unchanged, nothing wraps.
5. **A session**: the pair vanishes from the bar as the opening plays and returns on exit; the
   bar and toggle leave with the sheet.
6. **Tab from the search**: it should reach Begin, then the review chip, then the toggle, then
   the filter rail.
7. **The pastille bands byte-identical**: pink urgency, latte housekeeping, butter notes, white
   tag pills — unchanged against the deployed board.

## Deviations (flagged)

- **The bar pills are 11px, not the ref's 9.5px.** The ref's 9.5 is one step down from *its*
  11px hero pill; ours is a 12.5px hero pill, so one step down is 11 — the pack's rule ("a
  step down from their hero size") applied to our own type scale rather than the ref's
  absolute value.
- **The toggle is 26px** (the ref's geometry) rather than its previous 30px, so it sits
  comfortably in a 36px bar; its active chip — white with the ink ring — is unchanged as
  specified.
- **The collapse tier is 680px, not the bare 640px collision**, for the 40px cushion described
  above. It is baked from measurement either way, and at real desktop widths the pills never
  collapse — the bar has ~236px of slack at the 812 sheet.
- **Tab order needed a DOM reorder**, not `tabindex`: the sheet leads and the rail takes
  `order: -1`. Visual order and the ≤900px wrap behaviour are unchanged.
- jsdom mounts nothing: heights, order and the collapse are source/rule-text locks over the
  shared tokens; the browser checklist confirms the pixels.

## Close

**Colour settled, board final. The queue is now literally: dev deploy → prod sequencing pass →
Correction UI.**
