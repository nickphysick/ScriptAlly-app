# Query state colours — five flat tints (rulesheet v2)

**Status:** locked, 6 Sep 2026. Supersedes `query-tint-ladder.md` (the three-step ladders) and every stripe/tracker experiment. Where any older ref disagrees, this sheet wins.

## The rule

**Colour says whose court it is and whether the journey has started. Depth is the `StatusDot`'s job.** No ladder steps, no stripes, no tracker. Five flat fills:

| Token | Hex | Statuses | Turn caption |
|---|---|---|---|
| `--state-queried` | `#f7efe3` sand | Queried | With the agent |
| `--state-agent`   | `#e0e5dd` sage | Partial Sent, Full Sent | With the agent |
| `--state-you`     | `#f5e6df` pink | Partial Requested, Full Requested, R&R, requested-but-unsent | With you |
| `--state-offer`   | `#d7e0e8` slate | Offer (undecided) | Offer |
| `--state-closed`  | `#e4e1db` grey | Closed, Rejected, Withdrawn, decided Offer, No response | Closed / No response |

Sand is the start of the journey — no hue of its own; sage and pink arrive with the agent's first reply. Sand is warmer than closed grey and must never be mistaken for it.

Accent (desk strip, active tab, target-rung ring, estimate bars): one deeper step of the same family — `#e7d9bd` sand · `#c7d0c2` sage · `#e8c9bb` pink · `#c9d6e1` slate · `#cfc9c1` grey — exposed as `--state-accent` on the drawer root. Derived from the same `state` as the fill; not a sixth token.

## Where it appears (same token, every surface)

Card band · leaf month strip · drawer header block · board column header and board card strip · list status pill · stat tiles' icon discs · any state-tinted row · dashboard pipeline · Fortnight in Focus · calendar bars.

## What colour never does

No time pressure (overdue = ink `!` ring + factual sentence). No hover change. Selection = 1.5px `#e8c8bc` ring, not a fill. Chips parchment-lifted, never tinted. No red; no burgundy outside `StatusDot`, Form 11 chevrons/selected day, and the inset-frame rgba. Closed is always grey; the reason is in words.

## Derivation

`state` comes from `lib/queryCardFacts.ts` fed by `recomputeQuery`. One mapping `{state} → token`, exported once. Nothing stores a colour.
