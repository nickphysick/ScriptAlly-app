# Retired by Responses v6 (4 Nov 2026)

`tests/e2e/rs5.measure.ts` and its fixture `tests/e2e/seedRs5.mjs` are retired whole. v6 restyles every surface those
locks read (they select `data-rsp5` probes that v6 renamed or removed), and `seedRs5.mjs` writes to the live dev project,
which CLAUDE.md (2 Nov) no longer allows by default. The v6 locks are `tests/e2e/rs6.measure.ts` on `seedRs6.mjs`, through
`fsTarget` (the emulator). One line per lock:

- **A1 title card** — the white title card with the blush highlighter and the wall hawk is removed (D7). Replaced by the navy header: rs6 H1.
- **A2 glance** — the four At a glance cards and their sentence are removed (D7). Replaced by the two reply cards: rs6 S1, S2.
- **B1 your move first** — re-pointed as rs6 C1 (the standard card, your move first).
- **C1 band figures** — the full-width navy band is removed (D7); its figures moved into the insights card's tiles. Not re-locked; the tiles' derivation is v5's `typicalWait`/`speedByKind`, unit-locked in `responses.test.ts`.
- **C2 warming up** — the warming-up cards stand, unchanged, inside the insights card. Not re-locked here; `isEarlyDays`/`WARM_NEED` stay unit-locked.
- **D1 bars** — the timing bars stand inside the oat card, unchanged. Not re-locked; `waitBrackets` stays unit-locked.
- **E1 note filter** — In their words stands (restyled only). Not re-locked; `noteItems` stays unit-locked.
- **F1 six columns, no packages** — the six columns move into each month's band: rs6 W1. No packages: rs6 P1.
- **F2 month groups and sort** — the month groups are now separate sheets: rs6 W1 (sorting on the headings is unchanged).
- **G1 panel** — re-pointed as rs6 R1 (a wall row and a request card open the panel) and E2 (a timeline disc does).
- **H1 empty, then populated without a reload** — re-pointed as rs6 R1.
- **P1 pin** — v5's navy list bar and its pin are removed (D7); each month's band is sticky within its sheet instead (W1 asserts `position: sticky`).
- **G2 acting** — the panel and its journeys are unchanged. Not re-locked in this pass.
- **S1 share builder** — `RspShare` is unchanged; the oat end card opens it. Not re-locked in this pass.
- **L1 no overflow** — not re-locked in this pass.
