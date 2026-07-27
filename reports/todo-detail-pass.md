# To-do — the detail pass (stacking · bar text · chip · notes · clock · colophon)

Run against HEAD `1275355` (the toolbelt pass, deployed to dev). Both refs fresh in Downloads
(23 Jul 14:41), read in full, committed with P1: `todo-fix10b.html` →
`design-refs/todo-detail-a.html` · `todo-fix10c.html` → `design-refs/todo-detail-b.html`
(ref a's §3 body copy fenced as superseded by ref b's §2 final wording).

## Phase 0 — the stacking diagnosis + the ancestor audit

**Fault 1 (bottom/inset pinning): ABSENT.** The surface already anchored
`position:absolute; top:0; left:0; right:0` with `min-height:100%` — the hotfix era got the
anchor law right.

**Fault 2 (the z-rule): PRESENT.** The raise lived on the SURFACE (`.tdb-tile.hov
{ z-index: 5 }`) — beneath the sticky section headings' `z-index: 10` (`.tdb-lh2`,
`.tdb-lsech`) — so a hovered card's expansion slid under the next section's heading.

**Ancestor audit (cell → sheet body):** `.tdb-grid` → `.tdb-lane` → `.tdb-lanes` (no own
rule) → `.tdb-sheetbody` → `.tdb-mainc` — none sets `overflow:hidden/clip`, `transform`,
`filter`, `will-change` or an own `z-index`; the chain is clean (the mainc's overflow was
deliberately kept off in the doc pass for exactly this reason). The sticky headings are
SIBLINGS, not ancestors — no restructure needed; the fix is out-ranking them. Locked as
assertions.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the stacking fix | `ffac778` | 1339 |
| P2 — air · the bar line · the inverse chip | `92da3d7` | 1340 |
| P3 — ledger Notes parity + the clock | `8fddee9` | 1342 |
| P4 — the colophon | `201596b` | 1341 |
| P5 — sweep | `396ca38` | 1343 |
| report | `<this commit>` | 1343 |

Gates green per commit (`tsc` + build + full Vitest, pipefail); explicit-path staging.

## What shipped

- **P1** — the corrected two-part law: the anchor stays top/left/right-only (asserted
  bottom-free and inset-free); the **CELL** now carries the raise — `z-index: 30` on
  `:hover` AND `:focus-within`, above the headings' 10 — with the surface's own z removed.
  The ledger's rows raise identically, so an open Snooze menu clears the headings too. The
  overlap itself is a paint-order fact jsdom cannot render — flagged for the browser walk.
- **P2** — **+28px air** between the search pill and all three columns (the work row opens
  at 50). The bar's left text is now a normal-weight **Playfair sentence** — "Showing {x}
  of {y} items on your list" — replacing the mono date/meta entirely; it reads the same
  `shownX/shownY` the rail counts derive from (live under search/filter), with
  `font-variant-numeric: lining-nums tabular-nums` keeping the figures on the baseline at a
  steady width. The **review chip is Begin's exact inverse**: identical geometry (44, full
  width, centred, 12.5/600/.02em — asserted against Begin's own rule), cream `#f3e7da`
  fill, ink `#2a1a13` text, `#1d100c` border; the cup left the chip; the unread dot rides
  inline after the label; all afterlife behaviour unchanged.
- **P3** — the ☰ view keeps **Notes to self even when empty**: the pack's wash hexes
  (`#fbf8ec→#f9f5e4` / `#ece2c6`, superseding the doc-pass derived whisper) with the
  centred dashed **"＋ Add a note"** row (`#d9c87a`) wired to the same addTask; with notes
  present, white row cards as before. The **snooze trigger** drops the ☾ moon and ▾
  chevron for the plain outline **clock** (ref b's recommended form, 13px, currentColor)
  leading "Snooze or dismiss" — one constant, one glyph, surfaced in both views (three
  call sites, one component).
- **P4** — the colleague banner is retired; **the colophon** ends the page on the bare
  ground: the slate ✦ breaking the hairline rule (oat backing), kicker "SCRIPTALLY PRO",
  Playfair "Hand over the housekeeping", the body verbatim per ref b with live-derived
  counts (bold pair slate `#3d5872`, lining figures), and the text links — "Meet the
  assistant →" (slate, the existing preview modal) · "What's in Pro" (muted, /plans).
  Gating and the `TODO(pro-assistant)` marker unchanged.
- **P5** — verification sweep: colleague family / mono meta / moon + chevron / the chip's
  cup all extinct (the banner keeps the big cup as the asset's remaining user); orphan
  scan clean; no tour step touches the bar text or the Pro area — nothing to retarget.

## In-browser checklist (dev)

1. **Hover a card in Urgent's last row**: the three stacked actions cover the Housekeeping
   heading (and in the ledger, an open Snooze menu does the same) — the one check jsdom
   can't paint.
2. The board breathing: 28 more pixels between the search and the columns.
3. The Playfair bar line; type "marsh": "Showing 3 of 44…" re-deriving live, the figures
   upright on the baseline, no width jitter as counts change.
4. The toolbelt pair: ink Begin over its cream inverse — same size, same type, colours
   swapped; the dot sitting inline after "Last week in review"; hover for the WK tooltip.
5. The ☰ view with no notes: the yellow wash stands with the dashed "＋ Add a note" row —
   clicking it opens the same note prompt.
6. The clock leading "Snooze or dismiss" on ledger rows and card hovers alike — no moon,
   no chevron; the dropdown unchanged.
7. The page ending on the colophon: the spark breaking the rule on bare ground, the new
   sentence with slate bold counts, both links working (modal · /plans).

## Deviations

- **The clock is not literally "via TypeGlyph"** — TypeGlyph is locked and hard-keyed to
  the three material `ComponentType`s (no clock, no arbitrary-icon API); rendering a clock
  through it verbatim would mean editing a locked component or abusing the enum. The
  page-scoped `ClockGlyph` follows TypeGlyph's exact grammar (currentColor stroke SVG,
  viewBox 24, size prop, aria-hidden) — the "never bare `.ti`" intent honoured.
- **The empty Notes section still hides under an active narrow with no matches** — parity
  with how the cards view hides its lanes; "even when empty" is read as the resting board.
- **The chip keeps its own soft shadow** (`0 2px 8px`) rather than Begin's heavier one —
  the pack's inverse lists geometry and colours only; a dark shadow under a cream pill
  read as smudge in the ref.
- **The notes-wash supersede** (`#fbf8ec…`) replaces hexes I derived in the doc pass when
  the pack specified only two washes — the pack now names all three; noted in the CSS.
- **`.tdb-propill` survives a "tdb-pro" ban** — FocusFlow's slate Pro pill is a live
  namesake; the colleague-extinction lock is lookahead-bounded around it.
- jsdom limits as ever: the stacking overlap, the figure baselines, the tooltip and the
  spark's ground-match are source/rule-text locks — the browser walk confirms the pixels.

## Close

**The redesign is complete; dev deploy → prod sequencing pass is the entire remaining
queue before Correction UI.**
