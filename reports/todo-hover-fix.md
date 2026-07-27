# Hotfix — the card hover expands as ONE surface

Single phase against `5e85a69`.

## The fault as found (Step 0)

The verb row was an **absolutely-positioned sibling tray**: `.tdb-verbs { position: absolute;
top: calc(100% − 1px); left/right: −1px }` carrying its **own** border (sides + bottom), its own
white background, its own bottom radius (0 0 12 12) and its own shadow — mounted conditionally
(`{hov && cardVerbs(c)}`) below a card that kept its full bottom border and radius. Two stacked
boxes, a visible seam at the joint, two shadows. The cards also carried `tabIndex={0}` with no
`:focus-visible` styling — hence the default blue ring. (The card itself was content-sized and
in flow; only the deep track padding stopped the tray reflowing things.)

## The rebuild (cell + surface)

- **`.tdb-cell`** — the reel slot: `position: relative; flex: 0 0 var(--tdb-cardw)`, a **fixed
  resting height per card kind** (`--tdb-cardh: 118px` unit · `--tdb-cardh-b: 212px` batch —
  new tokens; the v2 cards were near-uniform per kind anyway, and a fixed cell is what makes
  "the reel never reflows" structural rather than accidental). The cell never changes size.
- **The surface** (`.tdb-tile`/`.tdb-gcard` inside a cell) — `position: absolute; top/left/right:
  0; min-height: 100%`: the only border, background, radius and shadow; equals the cell at rest;
  grows past the cell's bottom edge on hover with `z-index: 5` raised — siblings untouched.
- **The verb row** — the surface's last child, inside the border: `.tdb-vwrap { display: grid;
  grid-template-rows: 0fr; transition: grid-template-rows 180ms ease }` → `.hov` `1fr`, with an
  `overflow: hidden` inner. No own background/border/radius/shadow — it inherits the surface's.
  Always mounted (the 0fr⇄1fr animation needs a live element); `visibility: hidden` on the inner
  (delayed 180ms on collapse) keeps the collapsed buttons out of the tab order, and
  `aria-hidden={!hov}` mirrors it.
- **Band**: unchanged — top corners follow the surface radius, no bottom radius, its existing
  1px bottom rule is the only horizontal line between band, body and verbs.
- **Timing**: the existing ~150ms JS hover-intent (`armVerbs`) arms; growth + lift ride 180ms
  ease; mouse-out disarms immediately and collapses with the same ease. `prefers-reduced-motion`:
  transitions off + `transform: none` on `.hov` (no lift, instant reveal).
- **Focus**: `:focus { outline: none }` kills the blue ring; `:focus-visible` = `2px solid
  var(--ink)` at 2px offset (outline follows the surface radius). Keyboard focus arms the same
  reveal (`onFocus` → `armVerbs`, unchanged).
- **The Later menu** now anchors against the SURFACE (`.tdb-latwrap` went `position: static`), so
  its containing block bypasses the inner clip; the track's bottom room grew (170px pad with the
  compensating negative margin) so growth + the open menu stay inside the scrollport.
- Overlay faces (receipts / dismissed / forks) render **without a cell** and stay in-flow — the
  base tile/gcard rules keep their flex slot; nothing else touched. The ledger rows are
  unaffected (their verbs never grew anything).

## Tests

The contract locks in `todoCardBands.test.ts` were rewritten to the one-surface law: cell fixed
heights + surface absolute/min-height 100%, the wrapper's grid trick and its
nothing-of-its-own assertion (no background/border/radius/shadow on `.tdb-vwrap`/`.tdb-verbs`),
z-raise, focus-visible + dead default ring, reduced-motion branch, always-mounted wrapper with
`aria-hidden` parity. Suite 1292 green; tsc + build green.

**jsdom caveat (as the pack anticipates):** the requested computed-style cell-height-constancy
and `getBoundingClientRect` containment checks aren't honest in jsdom (no layout) — they're
realised as the rule-text/structure locks above. The 150ms feel and the visual seamlessness
need the in-browser eyeball.

## In-browser checklist

1. Hover a batch card: ONE outline flowing around tag band, body and verbs — no seam, no second
   shadow edge at the joint; the row beneath never moves.
2. Hover a unit card: same; the verb row folds up on mouse-out with the same ease, no delay.
3. Tab to a card: a 2px ink outline (no blue), the verb row revealing exactly as hover.
4. ☾ LATER ▾ open: the menu drops below the expanded card, unclipped.
5. Reduced motion (OS toggle): no lift, instant reveal.
6. Card bottoms now sit uniform per kind (the fixed resting cells) — units at one height,
   batches at another, top-aligned as before.
