# Agent card — the visual language (ref `scriptally-closed-opacity.html`)

Presentation only. `agentStanding`, `agentTurn`, `isDoorOpen` and every filter, group and sort
behaviour are unchanged.

## The two devices

**Colour carries YOUR HISTORY.** Sage `#dce0d9` = something of yours is live. Soft pink
`#f5e2da` = nothing is. The band's pill names which pink case applies; the colour deliberately
does not distinguish them.

**The door is INK, never colour.** Closed = a hatched band overlay
(`repeating-linear-gradient(-45deg, rgba(46,39,35,.14) 0 3px, transparent 3px 9px)`,
`pointer-events:none`, above the colour and beneath the band's contents) plus an ink `Closed`
pill with a padlock, beside the standing pill.

## The full permutation table — three standings × two doors

| `agentStanding` | Door | Band | Hatch | `Closed` pill | Opacity |
|---|---|---|---|---|---|
| `Active queries` | open | sage `#dce0d9` | — | — | 1 |
| `Active queries` | **closed** | sage `#dce0d9` | ✔ | ✔ | **1 — never dims** |
| `No active queries` | open | pink `#f5e2da` | — | — | 1 |
| `No active queries` | **closed** | pink `#f5e2da` | ✔ | ✔ | **.6** |
| `Never queried` | open | pink `#f5e2da` | — | — | 1 |
| `Never queried` | **closed** | pink `#f5e2da` | ✔ | ✔ | **.6** |

Hover restores `opacity: 1` over `.15s` in every dimmed case — the record stays entirely valid
and should never be hard to read when someone goes looking.

**The one exception is row two.** A card with an active query never dims, whatever the door is
doing. An outstanding full or a live offer does not matter less because the agency shut its
doors — that is the exact case the retired door-precedence bug hid, and dimming it would
reintroduce the same error in a softer form.

## This inverts the app-wide rule, deliberately

See the **TWO-SYSTEMS EXCEPTION** in `CLAUDE.md`. Nearly every door is open, so colouring by
door would make nearly every card sage and colour would stop distinguishing anything scannable.
The agent list is reference data scanned by history; the Contact list is not, and keeps the
original rule. **The two pages differ on purpose.**
