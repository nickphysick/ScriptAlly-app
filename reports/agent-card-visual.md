# Agent card visual language — run report

**Branch:** `claude-il` · **Date:** 29 Jul 2026 · Follows `reports/agent-list-door-axis.md`
(`20a09d3` → `58c1523`). Ref: `design-refs/scriptally-closed-opacity.html`.
Presentation only — no derivation, filter, group or sort change.

## Commits + gates

Every commit passed `tsc --noEmit`, `vite build` and the full Vitest suite.

| Phase | SHA | Suite |
|---|---|---|
| 1 — colour and hatch | `ebce005` | 1725 |
| 2 — dim rule | `4b59829` | 1725 |
| 3 — locked spec | `cc3c563` | 1725 |

Suite 1720 → **1725**: five new locks (the colour/door split plus the four dim states).

## What `agentStateClass` was doing before

The actual CSS, not the class name:

```ts
if (!isDoorOpen(agent)) return "s-grey";   // the door OVERRODE everything
return agentRelationship(...) === "active" ? "s-sage" : "s-pink";
```

```css
.s-sage  { --agl-band: #dce0d9 }   /* sage */
.s-pink  { --agl-band: #f5e2da }   /* soft pink */
.s-grey  { --agl-band: #eae8e4 }   /* THE DOOR AS A COLOUR */
.s-grey .agl-facef .agl-acard        { opacity: .62 }   /* it already dimmed… */
.s-grey .agl-facef .agl-acard:hover  { opacity: 1 }     /* …and hover already restored */
```

So three things were true and two of them were wrong for this pack:

1. **The door was a colour** — grey, overriding sage/pink entirely, so a closed agency's card
   told you nothing about your own history with them.
2. **It already dimmed, at `.62`, unconditionally** — including the closed-agency-with-a-live-offer
   card. That is the softer form of the door-precedence bug the axis split removed: the fact was
   no longer *wrong*, but it was still *hidden*.
3. **Hover-restore already existed**, so that idea is carried over rather than introduced.

## What changed

- `agentStateClass` returns **`"s-sage" | "s-pink"` only** — the closed override is gone and
  `s-grey`'s band mapping is deleted (the grey *tokens* stay; other non-card surfaces use them).
- New pure `agentCardDims(agent, queries)` — the entire dim rule, unit-locked.
- The card composes **three independent classes** from three independent facts —
  `stateClass` (history) + `s-closed` (door) + `s-dim` — rather than one precedence chain.
- The door in ink: the hatch as `.s-closed .agl-band::after` (`pointer-events:none`) with
  `.s-closed .agl-band > * { position: relative; z-index: 1 }`, plus the `Closed` pill
  (solid `#2e2723`, white label, inline padlock SVG) beside the standing pill.
- Dim moved `.62` → **`.6`**, gated on `s-dim`, with the `.15s` transition on the opacity.

## Sharing — the red gate did not trip

`agentStateClass` has exactly two consumers: `AgentCard.tsx` and its own test.
`grep` for `AgentCard` also hits `onboarding/SmartImportReview.tsx`, but that file **declares its
own local `AgentCard`** (line ~1118) — a different component that happens to share the name. It
imports neither the agents card nor the helper, and uses no `.aglist` class. **No Contact-list or
Discover surface reads either**, so nothing outside the agent list was touched and the original
two-systems rule stands wherever it already applied.

## The four dim states — all locked and passing

| Door | Standing | Dims? |
|---|---|---|
| closed | not active | **yes** |
| closed | **active** | **no** — the exception |
| open | active | no |
| open | not active | no |

Plus a fifth lock on the hover restore and the hatch/pill rule text, since jsdom cannot compute
opacity or render a gradient.

## The exception is recorded

`CLAUDE.md` gains **⚠️ THE TWO-SYSTEMS EXCEPTION** above the rebuild-v2 section: what the
app-wide rule is, that the agent list inverts it deliberately, why (nearly every door is open, so
colouring by door would make nearly every card sage and colour would stop distinguishing anything
scannable — the agent list is reference data scanned by history, the Contact list is not), and
the plain statement that **the two pages differ on purpose and neither should be "corrected" to
match the other**. `design-refs/agent-card-visual.md` carries the full three-standings ×
two-doors permutation table.

## Needs a browser check

jsdom cannot verify computed opacity or the hatch gradient:

1. **Hatch legibility over both sage and pink** — `rgba(46,39,35,.14)` at 3px/9px reads
   differently on the darker sage than on the pink; confirm it says "closed" on both without
   turning either muddy.
2. **`.6` against the `#fdfbf8` capsule** — dim enough to recede, legible enough to read.
3. **Hover restore** — the `.15s` should feel like the card waking, not flicking.
4. **The active-at-a-closed-agency card at full strength beside dimmed neighbours** — this is the
   whole point of the exception; it should be obvious at a glance that it did not fade.
5. **The `Closed` pill beside the standing pill** — two pills in one band; check the row does not
   crowd at narrow card widths, since the band also carries stars and the edit control.
