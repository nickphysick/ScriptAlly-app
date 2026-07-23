# To-do — the toolbelt pass (sidebar restructure + card verb parity)

Run against HEAD `039b02c` (the frame pass, deployed to dev). The one ref fresh in Downloads
(`todo-fix9.html`, 23 Jul 14:02), read in full, committed with P1 as
`design-refs/todo-toolbelt.html`; options A, B and D fenced as rejected — nothing of them
built. Phase 0 confirmed the frame-pass state live with no drift (ink/hairline law, sectioned
rail, review afterlife, bare cog).

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the three-element stack | `e825ad5` | 1337 |
| P2 — card verb parity | `dcfc855` | 1337 |
| P3 — sweep + tour retarget | `66595c2` | 1338 |
| report | `<this commit>` | 1338 |

Gates green per commit (`tsc` + build + full Vitest, pipefail); explicit-path staging.

## What shipped

- **P1** — the left column is now a vertical **10px stack of three separate elements**, 248
  wide: **Begin focused session** free-standing (44px, full width, the soft
  `0 3px 12px rgba(29,16,12,.22)` shadow — the toolbelt bakes 44 over the law's 42); **the
  review chip** — a free-standing 38px white pill (hairline border, soft shadow: small cup,
  "Last week in review", the unread dot right-aligned; the `WK {n}` stamp moved into the
  chip's hover title so the resting face stays uncrowded); and **the filter-only card**
  (`.tdb-fbox`): the grey FILTER band takes the card's top radius with no top border, then
  SHOW ALL + family pills + divider + Today's list + the bare-cog foot. The REVIEW band and
  rail row are gone. **All afterlife behaviour transferred verbatim** — banner in the centre
  stack until opened or dismissed, the chip the persistent entry point, its dot cleared by
  opening, per-week reset.
- **P2** — the cards adopt the ledger's labels. The hover expansion (single-surface
  mechanics untouched; cards at rest untouched) stacks **three full-width 30px rows, 6
  apart, above a hairline**: "Action now" (emphasised hairline) · "＋/− Today's list"
  (quiet) · "☾ Snooze or dismiss ▾" (quiet, the same dropdown); the batch card stacks
  Action now + Snooze (groups stay uncommittable). Action now opens the acting surface —
  unit → journey, batch → Batch fix — exactly as row-click. **Every label reads the one
  shared `VERB_LABELS` constant** (ledger + cards; a future rename touches one place);
  `laterMenu` collapsed to its single parity form. The doc-pass "cards keep short verbs"
  baked divergence is **formally retired**, its assertion replaced by the inverse.
- **P3** — the compact `.tdb-verb` family swept from the stylesheet; the tour's review stop
  targets the chip ("or the chip beneath Begin") and the card stop speaks the parity
  phrases; orphan scan clean.

## In-browser checklist (dev)

1. Begin and the review floating above a filter-only card — three separate objects, 10
   apart; Begin's soft shadow breathing outside any card edge.
2. Hover the chip: the `WK {n}` tooltip; its dot glowing while the week is unopened.
3. Open the review (banner or chip): the banner collapses, **the dot clears**; dismiss
   instead: the banner goes but the dot stays. Reload — it all holds.
4. Hover a card: the expansion grows the **three stacked phrases** — Action now leading in
   ink-bordered white, the quiet pair beneath; the card at rest unchanged in height.
5. **Action now opening a journey from a card** (and Batch fix from a batch card) — exactly
   what clicking the card does.
6. Below 1428: the ⚲ FILTER drawer carries the same three-element stack.
7. The tour: stop 4 spotlights the chip; stop 5's copy names the new actions.

## Deviations

- **The ✓ DONE verb left the cards** — the pack's "quick-complete remains the card's
  existing affordance unchanged" collides with its own exhaustive three-row stack and the
  normative ref's §2 card (three rows, no ✓). Resolved in the ref's favour: the card's tick
  verb is gone; the quickDone pathway stands untouched at its other surfaces (the ledger's
  head checkbox, Today's tick). If the sentence meant "keep a ✓ row", it's a one-line add —
  flagged for the dev walk.
- **The icon-rail fold clause is inapplicable** — the Final Shape retired the 56px icon
  rail; below 1428 the board runs the ⚲ FILTER overlay drawer, which now carries the whole
  toolbelt ("filter card as today" holds; no per-element icon collapse exists to build).
- **`.tdb-fbox`, not "fcard"** — the obvious name sits on the Deck-v2 banned-identifier
  list.
- **Begin at 44** amends the frame law's fixed 42 for this one control (the pack + ref bake
  it); the `.sm`/hairline heights are untouched.
- **The review section renders only when a review week exists** (carried from the frame
  pass — a brand-new desk shows no chip).
- jsdom limits as ever: the float, the tooltip, the stack's growth and the shadow are
  source/rule-text locks — the browser walk confirms the pixels.

## Close

**Nothing queues before dev deploy and the prod sequencing pass.**
