# Retired by Query Centre v153.4 (9 Nov)

Each case below measured something v153.4 removed or replaced on purpose. They are `test.skip`ped in place, with a
pointer here, rather than deleted, so their readings can be looked up. What replaces each is in
`tests/e2e/qc1534.measure.ts`.

| Case | What it measured | Why retired | Replaced by |
|---|---|---|---|
| `qc1531` "v153.1 header" (H1–H4) | 190px hawk column and 36px gap; the legend's counts summing to the title; hovering a legend row; a legend-row click turning the rail on | The legend is gone; the header columns are 268 / 1fr / 400–560 with a 28px gap | qc1534 P2 (grid, edges, height), P4 (hover and focus on the segments, Enter and click toggling the stage) |
| `qc1531` "v153.1 pattern and rail header · 2560" (P1, P2) | The doodle visible at the foot, counted against the oat ground (242, 238, 232); the rail header white | The ground is #f5f5f3 (every pixel now differs from oat, so P1 would pass vacuously); the rail header has no fill | qc1534 P1 (ground, wash, tile, foot screenshot), P3 (rail header) |
| `qc1532` "v153.2" (O1, O2) | The legend heading "N sent", legend rows, the tooltip | Legend and tooltip removed | qc1534 P4 |
| `qc1533` "v153.3 P1 chips rail" | One white rail card; pills | The rail has no card; Most used is a list | qc1534 P3 |

The shared `ready()` in `qc1531` and `qc1532` waited for a legend row; it now waits for a ring segment, so their
remaining cases (slips, facts) still run.
