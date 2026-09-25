# Query Centre v65.4 — run log

25 September. Follows the overnight v65.3 run. Ref `design-refs/query-centre-v92.html`,
SHA256 `008c3401…02de2` — **matches the brief. No stop.**

## Premises, checked

- **HEAD** `9fb20151`, on `main`, level with `origin/main` (0 ahead, 0 behind). `src/` and `tests/`
  clean. (The tree carries other sessions' PNG/TXT artefacts under `reports/` and `run-artifacts/`,
  as it did overnight; no gate reads those paths, and gate cleanliness is read over `src/` and
  `tests/` only.)
- **Baseline gates:** tsc 0 · production build clean · **505 files, 8,390 passed, 3 skipped**.
- **The ref's live defaults are the brief's**, read from its own boot code rather than assumed:
  `hm=0 · oh2=1 · nd=3 · ym=2 · fl=a · fx=float`. No disagreement.
- **Nothing in this brief is already done on `main`.** Each item was checked against the source:
  the bars are `height: 10px` hairlines with 9px labels (A2), there is no `clip-path` in the
  timeline sheet (A3), the heat strip is live (B1), the overdue pill and tab are live (B2), the
  striped `--nd` patterns are live (B3), `--qcv-rust` is read by the bars and the ghost (C1–C3),
  the popover is a 300px unsectioned panel (D1), and the empty track is inert (D4).
- **One correction to the brief's framing, and the mock settles it (A4).** The rail's heading is not
  "in the display serif": v65.3 already gives it Special Elite 16px, the full-width background and
  the 22px inset. What IS wrong is measured below and fixed as part of A4.

## Plan

Fifteen items, one commit each with its lock, in this order — the cheap removals first so the
later builds measure against a settled row:

B1 → A3 → A2 → A4 → B2 → C1 → C2 → C3 → B3 → A1 → A5 → D4 → D1 → D2 → D3.

Phase 0 enrols v92 and repoints `qcV65.measure.ts`. Every value below is measured off the RENDERED
ref, never read out of its cascade — that file is cumulative (v4 → v92) and its first declaration
of a selector is routinely a whole design away from its last.

---

## Phase 0 + B1 — v92 enrolled; nothing under the dates

v92 enrolled in `design-refs/.refhashes.json`; `qcV65.measure.ts` repointed. **The heat strip and
its whole derivation are deleted** — `heatWeeks`, `HeatWeek`, `HEAT_CURRENT`, `HEAT_EXPECTED`, the
rules and the element. A pure function nothing calls is a thing the next reader has to trace to a
rendered root before they can touch the row it used to draw in.

**A lock went vacuously green and the prefix rule is why.** `toContain("tl-month")` is satisfied by
`tl-monthX`, so the mutation that removed the month bands reported clean. Bounded to
`["\s`]tl-month["\s`]` and re-proved red. **Three mutations, all red.**

**Two measurement assertions were about the strip** and are retired with their subject rather than
inverted: asserting "0 heat cells" is an absence nobody reads. What replaces them is the claim the
removal makes — the row still draws its bands and its Mondays.

- Gates: tsc 0 · build clean · **8,384 passed** (baseline 8,390; six heat cases retired with the
  derivation, no case lost coverage).
- Measurement: **30 passed**.
