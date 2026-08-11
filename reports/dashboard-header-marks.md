
---

# Addendum — the rim, the marks, and the sweep (closing the earlier pack)

Written after the fact to close the report the header-marks pack asked for. The work itself landed
across `a5a42f4` (panel extraction), `b1cfb9d` (mark slots), `75c79d0` + `daaf4da` (the ring),
`e2c0ad0` (the clipped lift) and `15a73c9` (Active queries' band).

## A shared panel primitive was extracted first

There was none: four containers, four header treatments, three structurally different. `OneScreenPanel`
was extracted as a **visually no-op commit** so that any pixel moving in it was a bug rather than a
judgement call, with the class strings pinned character for character. Everything after it —
marks, rim, band — landed as changes to one place.

## Marks — three, not four

| Container | Brief (in code comments, never rendered) |
|---|---|
| Active queries | a line rising across a ruled page, ink-drawn |
| Activity | a clock face over a stack of filed cards |
| Tasks | a pencil resting on a ticked list |
| ~~Querying goals~~ | **removed** — its header is a label, not an instrument |

Goals was given a mark and then had it taken away (`cfccf32`). Nothing else received one: the
counters card, author tile and Pro banner have no header to put a mark in, and inventing one would
be a design decision rather than a refactor.

## The rim sweep

**Fixed (dashboard):** every `.os-card` — the ring overlay is on the primitive, so all four
containers inherit it by construction rather than by being remembered.

**Reported only:**

| Surface | Container / child | Verdict |
|---|---|---|
| To-do desk card | `.dt-card` / `.dt-band` | Same fault exactly. **Latent** — `DeskTodoCard` is unmounted, so it will be rediscovered as new if remounted. |
| Auth illustration | `.sa-au-root .browser` / `.browser-bar` | Decorative fake-browser mock; symptom invisible. **Leave it** — fixing gains nothing. |

**False positives, recorded so the next sweep does not re-flag them:** `.pkgw-ghost .gbar`,
`.qc-ctxhd`, `.agl-av .cam` — all inner pills with their own radius, not flush bands.

**The useful finding: nobody had worked around it anywhere.** No matched backgrounds, no `::before`
hacks, no manually inset bands. The pattern was invisible rather than tolerated, which is the
argument for fixing it structurally in the primitive instead of per surface.

## Browser checklist — status

Bands, positions, wrap and hover are all measured (see `reports/dashboard-headers.md`). **The zoom
checks at 110% and 125% are NOT done** — fractional device pixels are where a 1px ring is most
likely to misbehave, and it is the one condition never tested. Worth doing on the deployed build
rather than in a harness.
