# Querying goals — design refs

## `175-goals-full-moment.html` — PRESENT, current
The target-reached state, drawn beside the in-progress state it replaces and the two-weeks-later
state it ages into. Carries the card geometry (count 31/18px Playfair, sub-label mono 9px, meter
8px/5px radius `#efe4dc` on `#bf8a7b`, history strip), the +101px height delta, the illustration
brief and the entrance-animation gate.

## `173-querying-goals.html` — ABSENT
Not on the machine, in `~/Downloads`, or anywhere in this repo, at the time the pack was built
(23 Aug). It was to have carried the card states and the set-target sheet. **The sheet was built
from the pack prose alone**, which specifies it completely: stepper 1–99, three cadence segments,
the live preview panel, and the two actions.

## The illustration — OUTSTANDING
`design/refreshed-designs/icons/Goal_Reached.png` does not exist. The icon set at
`~/Desktop/ScriptAlly/Refreshed Designs/Icons/` holds `Querying Goals Icon.png` and
`Query Target Icon.png` (the latter already ships as `src/assets/shell/query-target-icon.png`,
the card's existing mark) but nothing for the reached state.

⚠️ **Neither is a substitute and neither was used.** The reached state renders the ref's own 104px
dashed placeholder until the real asset lands — a placeholder says "an illustration belongs here
and has not arrived", where the target icon a second time would say "this is finished".

⚠️ **If the asset ships with an opaque white field** it needs `mix-blend-mode: multiply`, and then
no `transform` on any ancestor — including the entrance animation, whose keyframe must switch to
`position: relative; top`. The app currently carries no `mix-blend-mode` anywhere (the painted
marks that needed it were retired at `a7b5d54`), so this would reintroduce the trap.
