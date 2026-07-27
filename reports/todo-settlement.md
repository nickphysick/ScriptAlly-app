# To-do — the settlement (sage headers · the search · the pair's new seat)

Run against HEAD `5dd3c28`. **The colour question is closed**: the soft pastille card system is
untouched and settled — pink urgency, latte housekeeping, butter notes, white tag pills,
exactly as deployed. This pack changed container structure and the hero's furniture only.

Ref: `todo-fix40.html` → `design-refs/todo-settlement.html` (normative, fenced). Boards
fix31–**fix39** are exploration history — including fix39's stone headers and its bar-seated
pair, both built and dev-deployed earlier today and **superseded here**.

## Phase 0 — recon

- **Blush pack: still unrun** — no prompt file, zero blush/greige tokens.
- **But the STONE set was live** (`#f5f3f0` / `#e6e2db` at 36px, inks `#3a332c` / `#8a8074`),
  deployed to dev an hour before this pack. So P1 was a retokenisation, not a first pass.
- **Search: already at spec** — 460 × 46, font 13, 32px glass, `--tdb-search-clear: 40px`.
  Phase 2 was therefore a verification.
- **The pair's mount was the sheet's bar** (`.tdb-barpair` in `.tdb-barvt`), so P3 moved it
  bar → sidebar and stripped the bar's cluster, divider and collapse tier.
- **Today's sage tokens** (`--hk-sage #dce0d9` / `--hk-spine #b9c3b3`) are *near* but not the
  pack's `#d7ddd5→#d5dbd3` / `#b9c9b4`. The pack's hexes win; the head tokens carry them and
  Today's header now reads the head tokens, leaving `--hk-*` to its band and glyph duties.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| the ref, fenced (fix40 replaces fix39) | `6f7fa07` | 1466 |
| P1 — sage headers, one 42px height | `423d4a3` | 1467 |
| P2 — the grown search, verified | `714429e` | 1468 |
| P3 — REVIEW & FILTER, the pair at the sidebar's top | `2fc3aae` | 1469 |
| P4 — the sweep + this report | `<this commit>` | 1469 |

Gates green per commit (`tsc` + production build + full Vitest, pipefail); explicit-path
staging. Lock suite: `src/components/todo/todoSettlement.test.ts`.

## What shipped

- **P1 — sage, one height.** All three container headers take the soft sage Today already wore:
  `#d7ddd5 → #d5dbd3` over `#b9c9b4`, from **one source** on `.tdb-wrap` (both hexes asserted
  to appear exactly once in the sheet — no near-duplicates). `--container-head-h` steps 36 →
  **42px**, contents still flex-centred, no padding-derived heights, each header keeping its
  container's top radii. The inks join the family: mono `#5a6e58`, Playfair `#3d4a3b`. The view
  toggle moves onto sage (`rgba(255,255,255,.55)`, the shared rule) with its active chip —
  white plus the ink ring — unchanged. Sage's glyph-scale life (row dots, ticks, StatusDot
  incoming) is untouched beside it.
- **P2 — the search, verified.** Already at 460 × 46 / 13 / 32 with the 40px clearance token,
  so the phase re-ran the invariants against the taller heads and **strengthened the lock**
  where it was thin: the band is asserted *empty* (the hero's last child is the search row),
  the container row adds air above the floor rather than pulling into it, and the clearance is
  asserted independent of `--container-head-h`.
- **P3 — the REVIEW & FILTER seat.** The sidebar's band is retitled REVIEW & FILTER on the same
  sage. Begin (ink) and Last week in review (white) stack full-width at the top of the
  sidebar's body at `--tdb-sbpair-h: 34px`, centred labels, above a `#eee8dd` hairline, with
  the filter pills unchanged beneath. The hero is title + search only; the sheet's bar is back
  to its Playfair line and the toggle alone. **Session wiring stays one animation**: the pair
  unmounts from the sidebar, but the sidebar *is* the choreography's `EXIT_LEFT`, so the
  departure a writer sees is its slide — no fade of its own, the unmount landing off-screen —
  and both return with the sidebar on exit. Tab order is search → the pair → the pills → the
  sheet (the sidebar leads in the DOM again; `order: -1` retired with the bar seat).
- **No wrap, measured.** At the rail's 248px there are **206px** of label room against a
  **133px** worst-case label (Begin at 12.5px with its glyph) — 73px of slack. No supported
  tier wraps, so **no font step was needed**; the size stays `--tdb-sbpair-fs` so a future rail
  width has one knob, and ellipsis is banned on the labels (asserted).
- **P4 — the sweep.** `design-refs/themes.md` now carries **"To-do containers — sage
  (settled)"** — the sage trio, the 42px law, pastille-cards-are-signal, the REVIEW & FILTER
  seat — with the stone section marked **⚠️ SUPERSEDED** above it. The stone hexes
  (`#f5f3f0`, `#e6e2db`, `#3a332c`, `#8a8074`) and the bar-seat identifiers (`tdb-barvt`,
  `tdb-barpair`, `tdb-bardiv`, `tdb-bar-collapse`) are grep-asserted gone; blush/greige remain
  zero. The tour's Begin stop keeps `.tdb-herobegin` — the anchor followed the seat into the
  sidebar.

## In-browser checklist (dev)

1. **Three sage headers, level at 42px** — the sidebar's band, the sheet's bar, Today's header:
   same fill, same rule, same height, measured against each other.
2. **REVIEW & FILTER** on the sidebar's band, with Begin and the review chip **stacked
   full-width beneath it**, above the hairline, the filter pills unchanged below.
3. **The bar holds just its line and the toggle** — no pair, no divider.
4. **The larger search** (460 × 46, 32px glass) with clear ground beneath it before the
   containers begin.
5. **A session**: the pair leaves *with the sidebar's slide* — one movement, no separate fade,
   nothing left behind — and returns with it on exit.
6. **Tab from the search**: Begin → review chip → the filter pills → the sheet.
7. **The pastille bands byte-identical**: pink urgency, latte housekeeping, butter notes, white
   tag pills.

## Deviations (flagged)

- **The stacked pills are 34px at 12.5px**, per the pack's prose, rather than the ref's reuse
  of its 28px `.sm` class at 9.5px — the pack names the height explicitly and a 34px sidebar
  button carries the hero's own type size comfortably.
- **Today's `--hk-sage` pair was NOT repointed.** The pack's hexes differ slightly from Today's
  existing tokens, so the head tokens carry the pack's values and Today's header reads them;
  `--hk-sage`/`--hk-spine` keep their band and glyph duties untouched. That is "reuse the
  family, don't mint a near-duplicate head" — one head source, one glyph source.
- **The clearance band is effectively 90px, not 40.** The token is the guaranteed *minimum*
  (the search row's own bottom margin); the container row adds its pre-existing 50px of
  assembly air above it — a prior locked decision this pack does not touch. Both bands are
  empty, and the floor can never fall below the token.
- **No collapse tier was baked for the sidebar pair**, because the measurement shows none is
  reachable: 73px of slack at the narrowest supported width. The font stays tokened for the day
  a rail width changes.
- jsdom mounts nothing: heights, order, the seat and the no-wrap margin are source/rule-text
  locks over shared tokens and a real browser measurement; the checklist confirms the pixels.

## Close

**Colour settled, board final. The queue is now literally: dev deploy → prod sequencing pass →
Correction UI.**
